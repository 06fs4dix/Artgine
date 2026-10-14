import { CForgeScene } from "./CForgeScene.js";
import { CForgeCurve } from "./CForgeSpline.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeMonumentGen } from "./CForgeMonumentGen.js";
import { CForgeChurchGen } from "./CForgeChurchGen.js";
import { CForgeDockGen } from "./CForgeDockGen.js";
import { CForgeBridgeGen } from "./CForgeBridgeGen.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";
import { CForgeHanokGen } from "./CForgeHanokGen.js";
import { CForgeTempleGen } from "./CForgeTempleGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeYaguraGen } from "./CForgeYaguraGen.js";
import { CForgeMachiyaGen } from "./CForgeMachiyaGen.js";
import { CForgeChineseHouseGen } from "./CForgeChineseHouseGen.js";
import { CForgeChineseHallGen } from "./CForgeChineseHallGen.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeAdobeGen } from "./CForgeAdobeGen.js";
import { CForgeHutGen } from "./CForgeHutGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeAfricaGen } from "./CForgeAfricaGen.js";
import { CForgeMongolGen } from "./CForgeMongolGen.js";
export class CForgeCollide {
    static sWallStep = 2.5;
    static Build(_kind, _r, _g) {
        const K = CForgeScene.eKind;
        if (_r == null)
            return [];
        if (_kind == K.Wall)
            return CForgeCollide.Wall(_r, _g);
        if (_kind == K.Tower)
            return CForgeCollide.Tower(_r, _g);
        if (_kind == K.Building)
            return CForgeCollide.House(_r, _g);
        if (_kind == K.Fence)
            return CForgeCollide.Fence(_r, _g);
        if (_kind == K.Bridge)
            return CForgeCollide.Bridge(_r, _g);
        if (_kind == K.Stair)
            return CForgeCollide.Stair(_r, _g);
        if (_kind == K.Church)
            return CForgeCollide.Church(_r, _g);
        if (_kind == K.Dock)
            return CForgeCollide.Dock(_r, _g);
        if (_kind == K.Monument) {
            const m = _r, g = _g(m.c[0], m.c[1]), T = CForgeTheme.Of(m), [ha, hb] = CForgeMonumentGen.Half(m, T);
            return [CForgeCollide.Box(m.c[0], m.c[1], Math.cos(m.ang), Math.sin(m.ang), ha, hb, g - 0.5, g + CForgeMonumentGen.Height(m, T))];
        }
        return [];
    }
    static Church(_r, _g) {
        const u = _r.u, T = CForgeTheme.Of(_r);
        if (!T.Temple() && T.mChurch != 0) {
            const F = CForgeChurchGen.Frame(_r, _g);
            return CForgeChurchGen.Hull(_r, _g).map(([a, b, ha, hb, y0, y1]) => { const c = F.P(a, b); return CForgeCollide.Box(c[0], c[1], u[0], u[1], ha, hb, y0, y1); });
        }
        if (T.Temple()) {
            const M = CForgeTempleGen.Dim(_r, _g), hc = M.P(0, M.bh);
            return [CForgeCollide.Box(hc[0], hc[1], u[0], u[1], M.Wh * 0.5 + 0.8, M.Dh * 0.5 + 0.8, M.gmin - 0.6, M.f0),
                CForgeCollide.Box(hc[0], hc[1], u[0], u[1], M.Wh * 0.5 + 0.45, M.Dh * 0.5 + 0.45, M.f0, M.floor),
                CForgeCollide.Box(hc[0], hc[1], u[0], u[1], M.Wh * 0.5, M.Dh * 0.5, M.floor, M.yr)];
        }
        const D = CForgeChurchGen.Dim(_r, _g), L = _r.L, W = D.W, out = [];
        const pa = (D.uTower + D.uBack) * 0.5, nc = D.P(pa, 0), hl = (D.uTower - D.uBack) * 0.5;
        out.push(CForgeCollide.Box(nc[0], nc[1], u[0], u[1], hl, W * 0.5, D.base, D.floor + D.H));
        out.push(CForgeCollide.Box(nc[0], nc[1], u[0], u[1], hl + 0.4, W * 0.5 + 0.5, D.floor + D.H - 0.6, D.ridge));
        const tc = D.P(L * 0.5 - D.ts * 0.5, 0);
        out.push(CForgeCollide.Box(tc[0], tc[1], u[0], u[1], D.ts * 0.5, D.ts * 0.5, D.base, D.top + D.ts * 2.3));
        const ac = D.P(D.uBack, 0), ring = [];
        for (let k = 0; k < 8; k++)
            ring.push([ac[0] + Math.cos(k / 8 * Math.PI * 2) * D.ra, ac[1] + Math.sin(k / 8 * Math.PI * 2) * D.ra]);
        out.push(CForgeCollide.Prism(ring, D.base, D.floor + D.H * 0.78 + D.ra));
        const pw = Math.min(3.4, hl * 0.64), pc = D.P(pa, D.fs * (W * 0.5 + CForgeChurchGen.sPorch * 0.5));
        out.push(CForgeCollide.Box(pc[0], pc[1], u[0], u[1], pw * 0.5, CForgeChurchGen.sPorch * 0.5, D.base, D.floor + 4.3 + pw * 0.5));
        return out;
    }
    static Dock(_r, _g) {
        const a = _r.pts[0], b = _r.pts[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, hd = CForgeDockGen.Head(_r);
        const out = [CForgeCollide.Box((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, tx, tz, L * 0.5, _r.width * 0.5, _r.deck - 0.5, _r.deck)];
        if (hd > 0)
            out.push(CForgeCollide.Box(b[0] - tx * hd * 0.5, b[1] - tz * hd * 0.5, tx, tz, hd * 0.5, _r.width * 1.1 + 1.2, _r.deck - 0.5, _r.deck));
        return out;
    }
    static Hexa(_p) {
        const out = [], B = (i) => _p[i % 4], T = (i) => _p[4 + i % 4];
        for (let i = 0; i < 4; i++)
            out.push(B(i), B(i + 1), T(i + 1), B(i), T(i + 1), T(i));
        out.push(B(0), B(2), B(1), B(0), B(3), B(2), T(0), T(1), T(2), T(0), T(2), T(3));
        return out;
    }
    static Bridge(_p, _g) {
        if (_p.pts.length < 2)
            return [];
        const c = CForgeBridgeGen.Curve(_p), L = c.mLen, D = CForgeBridgeGen.Deck(c, _g, _p), half = _p.width * 0.5, out = [];
        if (L < 1)
            return out;
        const n = Math.max(1, Math.ceil(L / CForgeCollide.sWallStep));
        for (let k = 0; k < n; k++) {
            const p = c.At(L * k / n).p, q = c.At(L * (k + 1) / n).p, dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
            if (l < 1e-4)
                continue;
            const tx = dx / l, tz = dz / l, mx = (p[0] + q[0]) * 0.5, mz = (p[1] + q[1]) * 0.5, y = D(L * (k + 0.5) / n);
            out.push(CForgeCollide.Box(mx, mz, tx, tz, l * 0.5 + 0.05, half, y - 0.5, y));
            for (const side of [1, -1])
                out.push(CForgeCollide.Box(mx - tz * side * (half - 0.1), mz + tx * side * (half - 0.1), tx, tz, l * 0.5 + 0.05, 0.1, y, y + 1.0));
        }
        return out;
    }
    static Stair(_r, _g) {
        const a = _r.pts[0], b = _r.pts[1], run = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (run < 0.3)
            return [];
        const nx = -(b[1] - a[1]) / run * _r.width * 0.5, nz = (b[0] - a[0]) / run * _r.width * 0.5;
        const base = Math.min(_r.y[0], _g(a[0], a[1]), _g(b[0], b[1])) - 0.3;
        const ring = [[a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz], [a[0] + nx, a[1] + nz]];
        const top = [_r.y[0], _r.y[1], _r.y[1], _r.y[0]];
        const out = [CForgeCollide.Hexa([...ring.map(_q => [_q[0], base, _q[1]]), ...ring.map((_q, _i) => [_q[0], top[_i], _q[1]])])];
        if (_r.land > 0) {
            const tx = (b[0] - a[0]) / run, tz = (b[1] - a[1]) / run;
            out.push(CForgeCollide.Box(b[0] + tx * _r.land * 0.5, b[1] + tz * _r.land * 0.5, tx, tz, _r.land * 0.5, _r.width * 0.5, base, _r.y[1]));
        }
        return out;
    }
    static Box(_cx, _cz, _tx, _tz, _hl, _hw, _y0, _y1) {
        const nx = -_tz, nz = _tx;
        return CForgeCollide.Prism([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [_cx + _tx * _hl * a + nx * _hw * b, _cz + _tz * _hl * a + nz * _hw * b]), _y0, _y1);
    }
    static Prism(_poly, _y0, _y1) {
        const n = _poly.length, out = [];
        const B = (i) => [_poly[i % n][0], _y0, _poly[i % n][1]], T = (i) => [_poly[i % n][0], _y1, _poly[i % n][1]];
        for (let i = 0; i < n; i++)
            out.push(B(i), B(i + 1), T(i + 1), B(i), T(i + 1), T(i));
        for (let i = 1; i + 1 < n; i++)
            out.push(B(0), B(i + 1), B(i), T(0), T(i), T(i + 1));
        return out;
    }
    static Wall(_w, _g) {
        const TI = CForgeTheme.Of(_w), inca = TI.mCulture == CForgeTheme.eCulture.Andes && TI.mWallKind != 1 && TI.mWallStyle != 1;
        const c = new CForgeCurve(_w.curve), L = c.mLen, half = inca ? CForgeIncaGen.WallHalf(_w) : _w.thick * 0.5, out = [];
        const Gnd = (_s) => { const a = c.At(_s); return a.p.length > 3 ? a.p[3] : _g(a.p[0], a.p[1]); };
        const T = CForgeTheme.Of(_w), lim = T.World() ? T.LowWall() : !T.East() && T.mWallKind != 1 && T.mWallStyle == 3 ? CForgeWallGen.sGardenH : Infinity;
        const H = (_s) => Math.min(lim, c.At(_s).p[2]);
        const Piece = (_s0, _s1, _y0) => {
            const n = Math.max(1, Math.ceil((_s1 - _s0) / CForgeCollide.sWallStep));
            for (let k = 0; k < n; k++) {
                const a0 = _s0 + (_s1 - _s0) * k / n, a1 = _s0 + (_s1 - _s0) * (k + 1) / n;
                const p = c.At(a0).p, q = c.At(a1).p, dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
                if (l < 1e-4)
                    continue;
                const sm = (a0 + a1) * 0.5;
                out.push(CForgeCollide.Box((p[0] + q[0]) * 0.5, (p[1] + q[1]) * 0.5, dx / l, dz / l, l * 0.5 + 0.05, half, _y0(sm), Gnd(sm) + H(sm)));
            }
        };
        let s0 = 0;
        for (const gt of _w.gates) {
            const a0 = gt.s - gt.w * 0.5, a1 = gt.s + gt.w * 0.5;
            if (a0 > s0)
                Piece(s0, a0, _s => Gnd(_s) - 0.5);
            if (H(gt.s) >= 2.4) {
                const open = Math.min(H(gt.s) - 0.7, Math.max(2.1, gt.w * 1.15));
                Piece(a0, a1, _s => Gnd(gt.s) + open);
            }
            s0 = Math.max(s0, a1);
        }
        if (s0 < L)
            Piece(s0, L, _s => Gnd(_s) - 0.5);
        return out;
    }
    static Tower(_t, _g) {
        const g = _g(_t.c[0], _t.c[1]), r = _t.r * 1.06, ring = [], T = CForgeTheme.Of(_t);
        if (T.World() && T.mTowerKind != 1) {
            const C = CForgeTheme.eCulture, a = _t.attach.length > 0 ? _t.attach[0] : 0;
            if (T.mCulture == C.Mongol && T.mWallStyle == 2) {
                const r2 = CForgeMongolGen.CartR(_t) + 0.5;
                return [CForgeCollide.Box(_t.c[0], _t.c[1], Math.cos(a), Math.sin(a), r2, r2, g - 0.5, g + CForgeMongolGen.sCartDeck + CForgeHutGen.Dim(0, r2 - 0.5).top)];
            }
            if (T.mCulture == C.Africa && T.mWallStyle == 2) {
                const r2 = CForgeAfricaGen.HutR(_t);
                return [CForgeCollide.Box(_t.c[0], _t.c[1], 1, 0, r2, r2, g - 0.5, g + CForgeHutGen.Dim(1, r2).top)];
            }
            if (T.mCulture == C.Mongol) {
                const s = CForgeMongolGen.TowerS(_t);
                return [CForgeCollide.Box(_t.c[0], _t.c[1], Math.cos(a), Math.sin(a), s * 0.5, s * 0.5, g - 0.5, g + s * CForgeMongolGen.sStupaH)];
            }
            const up = T.mCulture == C.Arab ? CForgeArabGen.TowerTop(_t, T) : T.mCulture == C.Andes ? (T.mWallStyle == 1 ? CForgeIncaGen.ColonialTowerTop(_t) : CForgeIncaGen.TowerTop(_t)) : T.mCulture == C.Africa ? CForgeAfricaGen.TowerTop(T) : 0.65;
            const hw = T.mCulture == C.Egypt ? _t.r * 1.2 : T.mCulture == C.Africa && T.mWallStyle == 0 ? _t.r * 0.9 : r;
            return [CForgeCollide.Box(_t.c[0], _t.c[1], Math.cos(a), Math.sin(a), hw, hw, g - 0.5, g + _t.height + up)];
        }
        if (T.mTowerKind != 1 && T.mTowerStyle == 1)
            return [CForgeCollide.Prism(CForgeTowerGen.BastionPoly(_t).poly, g - 0.5, g + _t.height + 1.2)];
        if (T.mTowerKind != 1 && T.mTowerStyle == 2) {
            const a = _t.attach.length > 0 ? _t.attach[0] : 0, hw = CForgeTowerGen.ClockW(_t) * 0.5 + 0.2;
            return [CForgeCollide.Box(_t.c[0], _t.c[1], Math.cos(a), Math.sin(a), hw, hw, g - 0.5, g + _t.height + CForgeTowerGen.ClockTop(_t, T))];
        }
        if (T.East() && T.mTowerKind != 1) {
            const a = CForgeTowerGen.EastA(_t), w = CForgeTowerGen.EastW(_t), hw = w * 0.5;
            const E = CForgeTheme.eCulture, H = CForgeTowerGen.ChineseHall(_t);
            const up = T.mCulture == E.Japan ? CForgeYaguraGen.Height(w - 0.3, w - 0.3, CForgeTowerGen.JapaneseFloors(_t), CForgeTowerGen.sJapaneseFloorH)
                : T.mCulture == E.China ? 0.37 + CForgeChineseHallGen.Height(H.L, H.D, H.h, H.dbl) : 0.9;
            return [CForgeCollide.Box(_t.c[0], _t.c[1], Math.cos(a), Math.sin(a), hw, hw, g - 0.5, g + _t.height + up)];
        }
        if (CForgeTowerGen.ShapeOf(_t) == 1) {
            const w = _t.r * 0.9;
            ring.push([_t.c[0] - w, _t.c[1] - w], [_t.c[0] + w, _t.c[1] - w], [_t.c[0] + w, _t.c[1] + w], [_t.c[0] - w, _t.c[1] + w]);
        }
        else
            for (let k = 0; k < 10; k++)
                ring.push([_t.c[0] + Math.cos(k / 10 * Math.PI * 2) * r, _t.c[1] + Math.sin(k / 10 * Math.PI * 2) * r]);
        return [CForgeCollide.Prism(ring, g - 0.5, g + _t.height)];
    }
    static House(_b, _g) {
        const wk = CForgeHouseGen.WallOf(_b);
        if (wk >= 12) {
            const h = wk == 13 ? CForgeHutGen.Hull(_b, _g) : wk == 14 || wk == 15 ? CForgeIncaGen.Hull(_b, _g, wk) : CForgeAdobeGen.Hull(_b, _g, wk);
            return h.map(([p, y0, y1]) => CForgeCollide.Prism(CForgePoly.ConvexHull(p), y0, y1));
        }
        if (wk >= 4 && wk <= 9) {
            const C = wk >= 8 ? CForgeChineseHouseGen.Dim(_b, _g, wk) : null, J = wk >= 6 && wk < 8 ? CForgeMachiyaGen.Dim(_b, _g, wk) : null, K = C == null && J == null ? CForgeHanokGen.Dim(_b, _g, wk) : null;
            const X = C ?? J, gmin = X?.gmin ?? K.gmin, top = X?.top ?? K.top, ye = X?.ye ?? K.ye, e = (X?.e ?? K.opt.e) * 0.8;
            const hull = CForgePoly.ConvexHull(_b.poly), out = [CForgeCollide.Prism(hull, gmin - 0.5, top)];
            const { rects, W } = CForgeHanokGen.Rects(_b);
            for (const r of rects) {
                const hw = Math.min(r[2] - r[0], r[3] - r[1]) * 0.5, q = [[r[0] - e, r[1] - e], [r[2] + e, r[1] - e], [r[2] + e, r[3] + e], [r[0] - e, r[3] + e]].map(_p => { const w = W(_p[0], _p[1], 0); return [w[0], w[2]]; });
                out.push(CForgeCollide.Prism(q, ye - 0.3, C != null ? CForgeChineseHouseGen.RidgeY(C, hw) + 0.7 : J != null ? CForgeMachiyaGen.RidgeY(J, hw) : CForgeHanokGen.RidgeY(K.top, hw, K.giwa)));
            }
            return out;
        }
        let gmin = Infinity, gmax = -Infinity;
        for (const q of _b.poly) {
            const g = _g(q[0], q[1]);
            gmin = Math.min(gmin, g);
            gmax = Math.max(gmax, g);
        }
        const y0 = gmin - 0.5, y1 = gmax + 0.25 + _b.height, e = 0.5;
        if (_b.rects == null) {
            const hull = CForgePoly.ConvexHull(_b.poly);
            return [CForgeCollide.Prism(hull, y0, y1), CForgeCollide.Prism(CForgePoly.ConvexHull(CForgePoly.Offset(hull, e)), y1 - 0.4, y1 + _b.roofH + 0.2)];
        }
        const out = [];
        for (const r of _b.rects) {
            const W = (_r) => CForgePoly.ToWorld([[_r[0], _r[1]], [_r[2], _r[1]], [_r[2], _r[3]], [_r[0], _r[3]]], _b.o, _b.u);
            const ridge = CForgeHouseGen.RoofRise(_b, Math.min(r[2] - r[0], r[3] - r[1]) * 0.5);
            out.push(CForgeCollide.Prism(W(r), y0, y1));
            out.push(CForgeCollide.Prism(W([r[0] - e, r[1] - e, r[2] + e, r[3] + e]), y1 - 0.4, y1 + ridge + 0.2));
        }
        return out;
    }
    static Fence(_f, _g) {
        const out = [];
        for (let i = 0; i + 1 < _f.pts.length; i++) {
            const a = _f.pts[i], b = _f.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
            if (l < 1e-4)
                continue;
            const g = Math.min(_g(a[0], a[1]), _g(b[0], b[1]));
            out.push(CForgeCollide.Box((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, dx / l, dz / l, l * 0.5, 0.08, g - 0.3, g + 1.1));
        }
        return out;
    }
}
