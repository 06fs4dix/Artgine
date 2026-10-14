import { CForgePoly } from "./CForgePoly.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgeOpening } from "./CForgeOpening.js";
import { CForgePavilionGen } from "./CForgePavilionGen.js";
import { CForgeYaguraGen } from "./CForgeYaguraGen.js";
import { CForgeChineseHallGen } from "./CForgeChineseHallGen.js";
import { CForgeArabGen } from "./CForgeArabGen.js";
import { CForgeEgyptGen } from "./CForgeEgyptGen.js";
import { CForgeIncaGen } from "./CForgeIncaGen.js";
import { CForgeAfricaGen } from "./CForgeAfricaGen.js";
import { CForgeMongolGen } from "./CForgeMongolGen.js";
export class CForgeTowerGen {
    static sBody = [0.88, 0.84, 0.76];
    static sStone = [0.66, 0.62, 0.56];
    static sCap = [0.8, 0.76, 0.69];
    static sDark = [0.16, 0.14, 0.13];
    static sWood = [0.36, 0.23, 0.14];
    static sMetal = [0.36, 0.34, 0.33];
    static sRoof = [[0.74, 0.34, 0.24], [0.66, 0.3, 0.22], [0.42, 0.45, 0.56]];
    static Build(_t, _g) {
        const B = { body: new CForgeMeshBuf(), stone: new CForgeMeshBuf(), cap: new CForgeMeshBuf(), dark: new CForgeMeshBuf(), wood: new CForgeMeshBuf(), roof: new CForgeMeshBuf(), metal: new CForgeMeshBuf(), plank: new CForgeMeshBuf() };
        const [cx, cz] = _t.c, r = _t.r;
        let g = _g(cx, cz);
        for (let k = 0; k < 8; k++)
            g = Math.min(g, _g(cx + Math.cos(k * 0.785) * r * 1.1, cz + Math.sin(k * 0.785) * r * 1.1));
        const top = g + _t.height, T = CForgeTheme.Of(_t);
        if (T.mTowerKind == 1) {
            const rk = T.mRoofKind[_t.seed % T.mRoofKind.length];
            CForgeTowerGen.Watch(B, _t, g, top);
            const rc = rk == 1 ? T.mThatch[_t.seed % T.mThatch.length] : rk == 2 ? T.mShingle[_t.seed % T.mShingle.length] : T.mRoof[_t.seed % T.mRoof.length];
            const parts = [
                { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: B.plank, rgb: T.mWood.map(_v => Math.min(1, _v * 1.3)), tex: CForgeTex.sPlank },
                { buf: B.stone, rgb: T.mWallStone, tex: CForgeTex.sStone }, { buf: B.roof, rgb: rc, tex: rk == 1 ? CForgeTex.sThatch : rk == 2 ? CForgeTex.sShingle : CForgeTex.sTile },
            ];
            return parts.filter(_p => _p.buf.mIdx.length > 0);
        }
        const C = CForgeTheme.eCulture;
        if (T.mCulture == C.Arab)
            return CForgeArabGen.Tower(_t, g, top, T);
        if (T.mCulture == C.Egypt)
            return CForgeEgyptGen.Tower(_t, g, top, T);
        if (T.mCulture == C.Andes)
            return CForgeIncaGen.Tower(_t, g, top, T);
        if (T.mCulture == C.Africa)
            return CForgeAfricaGen.Tower(_t, g, top, T);
        if (T.mCulture == C.Mongol)
            return CForgeMongolGen.Tower(_t, g, top, T);
        if (T.mTowerStyle == 1)
            return CForgeTowerGen.Bastion(_t, g, top, T);
        if (T.mTowerStyle == 2)
            return CForgeTowerGen.Clock(_t, g, top, T);
        if (T.mCulture == CForgeTheme.eCulture.Japan)
            return CForgeTowerGen.Japanese(_t, g, top, T);
        if (T.mCulture == CForgeTheme.eCulture.China)
            return CForgeTowerGen.Chinese(_t, g, top, T);
        if (T.East())
            return CForgeTowerGen.Korean(_t, g, top, T);
        if (CForgeTowerGen.ShapeOf(_t) == 1)
            CForgeTowerGen.Square(B, _t, g, top);
        else
            CForgeTowerGen.Round(B, _t, g, top);
        const roofCol = T.mRoof[_t.seed % T.mRoof.length];
        const parts = [
            { buf: B.body, rgb: T.mTowerBody, tex: CForgeTex.sStone }, { buf: B.stone, rgb: T.mWallStone, tex: CForgeTex.sStone }, { buf: B.cap, rgb: T.mWallCap, tex: CForgeTex.sStone },
            { buf: B.dark, rgb: T.mDark }, { buf: B.wood, rgb: T.mWood, tex: CForgeTex.sWood }, { buf: B.roof, rgb: roofCol, tex: CForgeTex.sTile }, { buf: B.metal, rgb: T.mMetal },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static ShapeOf(_t) { const s = CForgeTheme.Of(_t).mTowerShape; return s >= 0 ? s : _t.shape; }
    static BastionPoly(_t) {
        const [cx, cz] = _t.c, r = _t.r;
        let ox = 0, oz = 0;
        for (const a of _t.attach) {
            ox -= Math.cos(a);
            oz -= Math.sin(a);
        }
        let l = Math.hypot(ox, oz);
        if (l < 0.3) {
            const a = (_t.attach[0] ?? 0) + Math.PI * 0.5;
            ox = Math.cos(a);
            oz = Math.sin(a);
            l = 1;
        }
        const fx = ox / l, fz = oz / l, sx = -fz, sz = fx, w = r * 1.5;
        const P = (_f, _s) => [cx + fx * _f + sx * _s, cz + fz * _f + sz * _s];
        return { poly: CForgePoly.Orient([P(-r * 0.6, -w), P(r * 1.1, -w), P(r * 2.4, 0), P(r * 1.1, w), P(-r * 0.6, w)]), tip: P(r * 2.2, 0), fx, fz };
    }
    static Bastion(_t, _g, _top, T) {
        const { poly, tip } = CForgeTowerGen.BastionPoly(_t), body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), earth = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), dark = new CForgeMeshBuf();
        const c = CForgePoly.Centroid(poly), y0 = _g - 1.0, k = (_top - y0) * 0.28 / Math.max(1, _t.r * 1.4), n = poly.length;
        const bot = poly.map(_p => [c[0] + (_p[0] - c[0]) * (1 + k), c[1] + (_p[1] - c[1]) * (1 + k)]);
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n, q = [[bot[i][0], y0, bot[i][1]], [bot[j][0], y0, bot[j][1]], [poly[j][0], _top, poly[j][1]], [poly[i][0], _top, poly[i][1]]];
            const ax = q[1][0] - q[0][0], az = q[1][2] - q[0][2], bx = q[3][0] - q[0][0], by = q[3][1] - q[0][1], bz = q[3][2] - q[0][2];
            let nn = [-az * by, az * bx - ax * bz, ax * by];
            const mx = (q[0][0] + q[1][0]) * 0.5 - c[0], mz = (q[0][2] + q[1][2]) * 0.5 - c[1];
            if (nn[0] * mx + nn[2] * mz < 0)
                nn = nn.map(_v => -_v);
            body.Quad(q, null, nn);
        }
        CForgeShape.Cap(earth, poly, _top - 0.02);
        CForgeShape.Extrude(stone, CForgePoly.Offset(poly, 0.18), _top - 0.3, _top);
        for (let i = 0; i < n; i++) {
            const a = poly[i], b = poly[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (l < 0.5)
                continue;
            let nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
            if (nx * ((a[0] + b[0]) * 0.5 - c[0]) + nz * ((a[1] + b[1]) * 0.5 - c[1]) < 0) {
                nx = -nx;
                nz = -nz;
            }
            const m = [(a[0] + b[0]) * 0.5 - nx * 0.4, (a[1] + b[1]) * 0.5 - nz * 0.4], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
            CForgeShape.Box(body, m[0], m[1], l, 0.8, _top, _top + 1.1, ang);
            CForgeShape.Box(stone, m[0], m[1], l + 0.05, 0.86, _top + 1.1, _top + 1.18, ang);
        }
        CForgeTowerGen.Lathe(body, tip[0], tip[1], [[0.5, _top + 0.5], [0.5, _top + 2.0]], 10);
        CForgeTowerGen.Lathe(cap, tip[0], tip[1], [[0.62, _top + 2.0], [0.55, _top + 2.25], [0.3, _top + 2.5], [0, _top + 2.62]], 10);
        for (let i = 0; i < 4; i++)
            CForgeTowerGen.ArchDecal(dark, tip[0], tip[1], 0.5, i * Math.PI * 0.5, _top + 1.1, 0.14, 0.5);
        const parts = [
            { buf: body, rgb: T.mWallBody, tex: CForgeTex.sStone }, { buf: stone, rgb: T.mWallCap, tex: CForgeTex.sStone },
            { buf: earth, rgb: T.mGreen.map(_v => _v * 0.95), tex: CForgeTex.sTurf }, { buf: cap, rgb: T.mWallCap.map(_v => _v * 0.8), tex: CForgeTex.sTile }, { buf: dark, rgb: T.mDark },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static ClockW(_t) { return Math.min(4.2, Math.max(2.4, _t.r * 1.5)); }
    static ClockDim(_t, T) {
        const w = CForgeTowerGen.ClockW(_t), mat = T.mChurchMat;
        return { w, cH: w * 0.95, bH: w * 0.85, rH: mat == 2 ? w * 1.7 : mat == 3 ? w * 0.95 : w * 1.25 };
    }
    static ClockTop(_t, T) { const D = CForgeTowerGen.ClockDim(_t, T); return D.cH + D.bH + D.rH + 1.0; }
    static Clock(_t, _g, _top, T) {
        const [cx, cz] = _t.c, { w, cH, bH, rH } = CForgeTowerGen.ClockDim(_t, T), ang = _t.attach.length > 0 ? _t.attach[0] : 0, ux = Math.cos(ang), uz = Math.sin(ang), mat = T.mChurchMat;
        const body = new CForgeMeshBuf(), trim = new CForgeMeshBuf(), roof = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), face = new CForgeMeshBuf(), gold = new CForgeMeshBuf(), iron = new CForgeMeshBuf();
        const OB = { stone: trim, fill: dark, dark }, K = CForgeOpening.eKind;
        const Faces = (_f) => [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([fu, fv], _k) => { const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv; _f(nx, nz, -nz, nx, _k); });
        const Sq = (_h) => CForgePoly.Orient([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + (ux * a - uz * b) * _h, cz + (uz * a + ux * b) * _h]));
        const Corner = (_d, _f) => { for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
            _f(cx + (ux * a - uz * b) * _d, cz + (uz * a + ux * b) * _d); };
        const yb = _g + 2.4;
        CForgeShape.Box(trim, cx, cz, w + 0.5, w + 0.5, _g - 1.0, _g + 0.35, ang);
        CForgeShape.Box(trim, cx, cz, w + 0.3, w + 0.3, _g + 0.35, yb, ang);
        CForgeShape.Box(trim, cx, cz, w + 0.42, w + 0.42, yb, yb + 0.22, ang);
        CForgeShape.Box(body, cx, cz, w, w, yb, _top, ang);
        Corner(w * 0.5 - 0.12, (x, z) => CForgeShape.Box(trim, x, z, 0.42, 0.42, yb + 0.22, _top, ang));
        const nStage = Math.max(1, Math.floor((_top - yb - 0.4) / 3.4));
        for (let k = 1; k < nStage; k++) {
            const y = yb + (_top - yb) * k / nStage;
            CForgeShape.Box(trim, cx, cz, w + 0.18, w + 0.18, y - 0.1, y + 0.1, ang);
        }
        Faces((nx, nz, tx, tz, k) => {
            const ox = cx + nx * (w * 0.5 + 0.15), oz = cz + nz * (w * 0.5 + 0.15);
            if (k == 0 && _t.door == null)
                CForgeOpening.Door({ ...OB, door: iron }, ox, _g + 0.35, oz, tx, tz, nx, nz, Math.min(1.4, w * 0.36), 2.0, K.Round, 1);
            else
                CForgeOpening.Window(OB, ox, _g + 0.9, oz, tx, tz, nx, nz, w * 0.18, 1.0, K.Round);
            for (let s = 0; s < nStage; s++) {
                const y0 = yb + (_top - yb) * s / nStage + 0.6, y1 = yb + (_top - yb) * (s + 1) / nStage - 0.5;
                if (y1 - y0 > 1.2)
                    CForgeOpening.Window(OB, cx + nx * w * 0.5, y0, cz + nz * w * 0.5, tx, tz, nx, nz, Math.min(0.5, w * 0.14), y1 - y0, K.Round);
            }
        });
        const y1 = _top, y2 = _top + cH, wc = w + 0.3, r = Math.min(wc * 0.3, cH * 0.36), yc = y1 + cH * 0.46;
        CForgeShape.Box(trim, cx, cz, wc + 0.15, wc + 0.15, y1 - 0.12, y1 + 0.15, ang);
        CForgeShape.Box(body, cx, cz, wc, wc, y1 + 0.15, y2 - 0.3, ang);
        Corner(wc * 0.5 - 0.1, (x, z) => CForgeShape.Box(trim, x, z, 0.36, 0.36, y1 + 0.15, y2 - 0.3, ang));
        CForgeShape.Box(trim, cx, cz, wc + 0.25, wc + 0.25, y2 - 0.3, y2 - 0.12, ang);
        CForgeShape.Box(trim, cx, cz, wc + 0.45, wc + 0.45, y2 - 0.12, y2, ang);
        Faces((nx, nz, tx, tz) => {
            const ox = cx + nx * wc * 0.5, oz = cz + nz * wc * 0.5;
            const Disc = (_b, _r, _o) => { const p = []; for (let k = 0; k < 24; k++) {
                const a = k / 24 * Math.PI * 2;
                p.push([ox + nx * _o + tx * Math.cos(a) * _r, yc + Math.sin(a) * _r, oz + nz * _o + tz * Math.cos(a) * _r]);
            } _b.Poly(p, [nx, 0, nz]); };
            Disc(trim, r + 0.18, 0.06);
            Disc(iron, r + 0.04, 0.1);
            Disc(face, r - 0.04, 0.12);
            const P = (_a, _l, _o) => [ox + nx * _o + tx * Math.cos(_a) * _l, yc + Math.sin(_a) * _l, oz + nz * _o + tz * Math.cos(_a) * _l];
            for (let k = 0; k < 12; k++) {
                const a = k / 12 * Math.PI * 2, big = k % 3 == 0;
                CForgeTowerGen.Strut(iron, P(a, r * (big ? 0.7 : 0.78), 0.14), P(a, r * 0.9, 0.14), big ? 0.07 : 0.04);
            }
            CForgeTowerGen.Strut(gold, P(1.25, -r * 0.12, 0.17), P(1.25, r * 0.55, 0.17), 0.07);
            CForgeTowerGen.Strut(gold, P(-0.4, -r * 0.15, 0.19), P(-0.4, r * 0.82, 0.19), 0.05);
            Disc(gold, 0.07, 0.21);
            const hw = wc * 0.36, py = y2, Q = (_u, _y) => [ox + nx * 0.2 + tx * _u, _y, oz + nz * 0.2 + tz * _u];
            CForgeShape.Box(trim, ox + nx * 0.1, oz + nz * 0.1, hw * 2 + 0.2, 0.2, py, py + 0.12, Math.atan2(tz, tx));
            trim.Poly([Q(-hw, py + 0.12), Q(hw, py + 0.12), Q(0, py + 0.12 + hw * 0.42)], [nx, 0, nz]);
            for (const sd of [-1, 1])
                roof.Quad([Q(sd * hw, py + 0.12), Q(0, py + 0.12 + hw * 0.42), [ox - nx * 0.4, py + 0.12 + hw * 0.42, oz - nz * 0.4], [ox - nx * 0.4 + tx * sd * hw, py + 0.12, oz - nz * 0.4 + tz * sd * hw]], null, [nx * 0.2 + tx * sd * 0.9, 1, nz * 0.2 + tz * sd * 0.9]);
        });
        const y3 = y2 + bH, wb = w * 0.82;
        CForgeShape.Box(body, cx, cz, wb, wb, y2, y3, ang);
        Corner(wb * 0.5, (x, z) => CForgeShape.Box(trim, x, z, 0.4, 0.4, y2, y3 - 0.2, ang));
        Faces((nx, nz, tx, tz) => {
            for (const off of [-0.22, 0.22])
                CForgeOpening.Window(OB, cx + nx * wb * 0.5 + tx * wb * off, y2 + 0.5, cz + nz * wb * 0.5 + tz * wb * off, tx, tz, nx, nz, wb * 0.26, bH - 0.9, K.Round);
            const bx = cx + nx * (wb * 0.5 + 0.3), bz = cz + nz * (wb * 0.5 + 0.3), a = Math.atan2(tz, tx);
            CForgeShape.Box(trim, bx, bz, wb + 0.6, 0.12, y2 + 0.7, y2 + 0.8, a);
            for (let k = 0, n = Math.round((wb + 0.4) / 0.28); k <= n; k++) {
                const u = -(wb + 0.4) * 0.5 + (wb + 0.4) * k / n;
                CForgeTowerGen.Lathe(trim, bx + tx * u, bz + tz * u, [[0.05, y2], [0.08, y2 + 0.25], [0.04, y2 + 0.55], [0.06, y2 + 0.7]], 6);
            }
        });
        CForgeShape.Box(trim, cx, cz, wb + 0.4, wb + 0.4, y3 - 0.2, y3, ang);
        let yt = y3;
        if (mat == 2) {
            CForgeShape.Pyramid(roof, Sq(wb * 0.5), y3, rH, 0.15);
            Corner(wb * 0.5 + 0.05, (x, z) => { CForgeShape.Box(trim, x, z, 0.3, 0.3, y3, y3 + 0.6, ang); CForgeTowerGen.Lathe(roof, x, z, [[0.2, y3 + 0.6], [0, y3 + 1.4]], 6); });
            yt = y3 + rH;
        }
        else if (mat == 3) {
            CForgeShape.Pyramid(roof, Sq(wb * 0.5), y3, wb * 0.3, 0.25);
            const yo = y3 + wb * 0.28, ro = wb * 0.24;
            for (let k = 0; k < 8; k++) {
                const a = k / 8 * Math.PI * 2;
                CForgeShape.Box(trim, cx + Math.cos(a) * ro, cz + Math.sin(a) * ro, 0.09, 0.09, yo, yo + rH * 0.45, a);
            }
            CForgeTowerGen.Lathe(roof, cx, cz, [[ro + 0.15, yo + rH * 0.45], [0.05, yo + rH * 0.8]], 8);
            yt = yo + rH * 0.8;
        }
        else {
            const rd = wb * 0.4, hd = rH * 0.22, yd = y3 + hd, hm = rH * 0.48;
            CForgeTowerGen.Lathe(body, cx, cz, [[rd, y3], [rd, yd]], 16);
            CForgeTowerGen.Ring(trim, cx, cz, rd - 0.05, rd + 0.12, yd - 0.12, yd, 16);
            for (let k = 0; k < 8; k++)
                CForgeTowerGen.ArchDecal(dark, cx, cz, rd, k / 8 * Math.PI * 2 + 0.2, y3 + hd * 0.2, rd * 0.22, hd * 0.6);
            const prof = [];
            for (let k = 0; k <= 10; k++) {
                const a = k / 10 * Math.PI * 0.5;
                prof.push([(rd + 0.1) * Math.pow(Math.cos(a), 0.8), yd + hm * Math.sin(a)]);
            }
            CForgeTowerGen.Lathe(roof, cx, cz, prof, 16);
            for (let k = 0; k < 8; k++) {
                const a = k / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
                for (let j = 0; j < 5; j++) {
                    const p = prof[j * 2], q = prof[j * 2 + 2];
                    CForgeTowerGen.Strut(trim, [cx + c * (p[0] + 0.03), p[1], cz + s * (p[0] + 0.03)], [cx + c * (q[0] + 0.03), q[1], cz + s * (q[0] + 0.03)], 0.08);
                }
            }
            const yl = yd + hm - 0.08, rl = rd * 0.28, hl = rH * 0.22;
            CForgeTowerGen.Lathe(trim, cx, cz, [[rl, yl], [rl, yl + hl]], 8);
            for (let k = 0; k < 4; k++)
                CForgeTowerGen.ArchDecal(dark, cx, cz, rl, k * Math.PI * 0.5, yl + hl * 0.15, rl * 0.6, hl * 0.65);
            CForgeTowerGen.Lathe(roof, cx, cz, [[rl + 0.1, yl + hl], [rl * 0.5, yl + hl + rl * 0.6], [0.04, yl + hl + rl * 1.2]], 8);
            yt = yl + hl + rl * 1.2;
            CForgeTowerGen.Lathe(gold, cx, cz, [[0, yt], [0.16, yt + 0.16], [0, yt + 0.32]], 8);
            yt += 0.3;
        }
        CForgeShape.Box(iron, cx, cz, 0.05, 0.05, yt - 0.05, yt + 0.8, ang);
        const bodyMat = mat == 2 ? { rgb: T.mBrick, tex: CForgeTex.sBrickWall } : mat == 3 ? { rgb: T.mClapboard[0], tex: CForgeTex.sShitami } : { rgb: T.mTowerBody, tex: CForgeTex.sPlaster };
        const parts = [
            { buf: body, rgb: bodyMat.rgb, tex: bodyMat.tex }, { buf: trim, rgb: mat == 3 ? [0.95, 0.95, 0.93] : T.mStone, tex: mat == 3 ? CForgeTex.sPlaster : CForgeTex.sStone },
            { buf: roof, rgb: mat == 0 ? CForgeTowerGen.sCopper : T.mRoof[_t.seed % T.mRoof.length], tex: mat == 0 ? CForgeTex.sPlank : CForgeTex.sTile },
            { buf: dark, rgb: T.mDark }, { buf: face, rgb: [0.93, 0.9, 0.8], tex: CForgeTex.sPlaster }, { buf: gold, rgb: [0.85, 0.66, 0.24] }, { buf: iron, rgb: T.mIron },
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static sCopper = [0.38, 0.58, 0.5];
    static ArcR(_r) {
        const m = CForgeTex.sMeter;
        return Math.max(1, Math.round(Math.PI * 2 * _r / m)) * m / (Math.PI * 2);
    }
    static Lathe(_b, _cx, _cz, _prof, _seg) {
        const n = _prof.length;
        const nr = [], vs = [_prof[0][1]];
        for (let i = 0; i < n; i++) {
            const a = _prof[Math.max(0, i - 1)], c = _prof[Math.min(n - 1, i + 1)];
            const dr = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dr, dy) || 1;
            nr.push([dy / l, -dr / l]);
            if (i > 0)
                vs.push(vs[i - 1] + Math.hypot(_prof[i][0] - _prof[i - 1][0], _prof[i][1] - _prof[i - 1][1]));
        }
        for (let i = 0; i + 1 < n; i++) {
            if (Math.abs(_prof[i][0]) < 1e-6 && Math.abs(_prof[i + 1][0]) < 1e-6)
                continue;
            const ru = CForgeTowerGen.ArcR((_prof[i][0] + _prof[i + 1][0]) * 0.5), base = _b.Count();
            for (let k = 0; k <= _seg; k++) {
                const a = k / _seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
                for (const j of [i, i + 1]) {
                    const [pr, py] = _prof[j];
                    _b.Vert(_cx + cs * pr, py, _cz + sn * pr, a * ru, vs[j], cs * nr[j][0], nr[j][1], sn * nr[j][0]);
                }
            }
            const m = [(nr[i][0] + nr[i + 1][0]) * 0.5, (nr[i][1] + nr[i + 1][1]) * 0.5];
            for (let k = 0; k < _seg; k++) {
                const a = (k + 0.5) / _seg * Math.PI * 2, i0 = base + k * 2;
                _b.QuadIdx(i0, i0 + 2, i0 + 3, i0 + 1, Math.cos(a) * m[0], m[1], Math.sin(a) * m[0]);
            }
        }
    }
    static Ring(_b, _cx, _cz, _rIn, _rOut, _y0, _y1, _seg, _inner = false) {
        CForgeTowerGen.Lathe(_b, _cx, _cz, [[_rOut, _y0], [_rOut, _y1]], _seg);
        for (const [y, ny] of [[_y1, 1], [_y0, -1]]) {
            const base = _b.Count();
            for (let k = 0; k <= _seg; k++) {
                const a = k / _seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
                _b.Vert(_cx + cs * _rIn, y, _cz + sn * _rIn, cs * _rIn, sn * _rIn, 0, ny, 0);
                _b.Vert(_cx + cs * _rOut, y, _cz + sn * _rOut, cs * _rOut, sn * _rOut, 0, ny, 0);
            }
            for (let k = 0; k < _seg; k++)
                _b.QuadIdx(base + k * 2, base + k * 2 + 2, base + k * 2 + 3, base + k * 2 + 1, 0, ny, 0);
        }
        if (_inner) {
            const base = _b.Count(), ru = CForgeTowerGen.ArcR(_rIn);
            for (let k = 0; k <= _seg; k++) {
                const a = k / _seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
                _b.Vert(_cx + cs * _rIn, _y0, _cz + sn * _rIn, a * ru, _y0, -cs, 0, -sn);
                _b.Vert(_cx + cs * _rIn, _y1, _cz + sn * _rIn, a * ru, _y1, -cs, 0, -sn);
            }
            for (let k = 0; k < _seg; k++) {
                const a = (k + 0.5) / _seg * Math.PI * 2;
                _b.QuadIdx(base + k * 2, base + k * 2 + 2, base + k * 2 + 3, base + k * 2 + 1, -Math.cos(a), 0, -Math.sin(a));
            }
        }
    }
    static Soffit(_b, _cx, _cz, _rIn, _rOut, _y, _seg) {
        const base = _b.Count();
        for (let k = 0; k <= _seg; k++) {
            const a = k / _seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
            _b.Vert(_cx + cs * _rIn, _y, _cz + sn * _rIn, cs * _rIn, sn * _rIn, 0, -1, 0);
            _b.Vert(_cx + cs * _rOut, _y, _cz + sn * _rOut, cs * _rOut, sn * _rOut, 0, -1, 0);
        }
        for (let k = 0; k < _seg; k++)
            _b.QuadIdx(base + k * 2, base + k * 2 + 2, base + k * 2 + 3, base + k * 2 + 1, 0, -1, 0);
    }
    static ArchDecal(_b, _cx, _cz, _r, _a, _y0, _w, _h) {
        const R = _r + 0.025, hw = _w * 0.5, spring = _y0 + Math.max(0, _h - hw);
        const P = (u, y) => { const a = _a + u / R; return [_cx + Math.cos(a) * R, y, _cz + Math.sin(a) * R]; };
        const nx = Math.cos(_a), nz = Math.sin(_a);
        _b.Quad([P(-hw, _y0), P(hw, _y0), P(hw, spring), P(-hw, spring)], [[0, 0], [1, 0], [1, 1], [0, 1]], [nx, 0, nz]);
        const c = P(0, spring), ci = _b.Vert(c[0], c[1], c[2], 0.5, 0, nx, 0, nz), seg = 8;
        let prev = -1;
        for (let k = 0; k <= seg; k++) {
            const t = k / seg * Math.PI, p = P(Math.cos(t) * hw, spring + Math.sin(t) * hw);
            const vi = _b.Vert(p[0], p[1], p[2], 0, 0, nx, 0, nz);
            if (prev >= 0)
                _b.Tri(ci, prev, vi, nx, 0, nz);
            prev = vi;
        }
    }
    static Free(_t, _a, _gap) {
        const near = (_b) => Math.abs(Math.atan2(Math.sin(_a - _b), Math.cos(_a - _b))) < _gap;
        return !_t.attach.some(near) && !(_t.door != null && near(_t.door));
    }
    static Round(B, _t, _g, _top) {
        const [cx, cz] = _t.c, r = _t.r, seg = Math.min(32, Math.max(14, Math.round(r * 7)));
        const R = new CForgeRand(_t.seed);
        CForgeTowerGen.Lathe(B.stone, cx, cz, [[r * 1.14, _g - 1.0], [r * 1.12, _g + 0.4], [r, _g + 1.4]], seg);
        CForgeTowerGen.Lathe(B.body, cx, cz, [[r, _g + 1.4], [r, _top]], seg);
        for (let k = 1; k < _t.floors; k++) {
            const y = _g + _t.height * k / _t.floors;
            CForgeTowerGen.Ring(B.stone, cx, cz, r * 0.98, r + 0.1, y - 0.12, y + 0.12, seg);
        }
        const off = R.Range(0, Math.PI * 2);
        for (let k = 0; k < _t.floors; k++) {
            const count = Math.max(1, Math.round(Math.PI * 2 * r / 6)), y = _g + _t.height * (k + 0.45) / _t.floors;
            const slit = k == 0 || r < 1.8;
            for (let j = 0; j < count; j++) {
                const a = off + k * 0.9 + j * Math.PI * 2 / count;
                if (!CForgeTowerGen.Free(_t, a, 0.55))
                    continue;
                const nx = Math.cos(a), nz = Math.sin(a), OB = { stone: B.stone, fill: B.dark, dark: B.dark };
                if (slit)
                    CForgeOpening.Slit(OB, cx + nx * r, Math.max(y, _g + 2.0), cz + nz * r, -nz, nx, nx, nz, 0.17, 0.9);
                else
                    CForgeOpening.Window(OB, cx + nx * r, y - 0.6, cz + nz * r, -nz, nx, nx, nz, 0.55, 1.2, CForgeOpening.eKind.Round, true);
            }
        }
        if (_t.door != null)
            CForgeTowerGen.RaisedDoor(B, cx + Math.cos(_t.door) * r, cz + Math.sin(_t.door) * r, Math.cos(_t.door), Math.sin(_t.door), _g, _g + 1.4);
        if (_t.flat) {
            const pr = r + 0.3;
            CForgeTowerGen.Lathe(B.stone, cx, cz, [[r, _top - 0.9], [pr, _top - 0.2], [pr, _top]], seg);
            CForgeTowerGen.Ring(B.body, cx, cz, pr - 0.35, pr, _top, _top + 0.65, seg, true);
            const deck = [];
            for (let k = 0; k < seg; k++)
                deck.push([cx + Math.cos(k / seg * Math.PI * 2) * (pr - 0.34), cz + Math.sin(k / seg * Math.PI * 2) * (pr - 0.34)]);
            CForgeShape.Cap(B.stone, deck, _top + 0.08);
            const mc = Math.max(6, Math.round(Math.PI * 2 * pr / 1.35));
            for (let k = 0; k < mc; k++) {
                const a = (k + 0.5) / mc * Math.PI * 2, x = cx + Math.cos(a) * (pr - 0.17), z = cz + Math.sin(a) * (pr - 0.17);
                CForgeShape.Box(B.body, x, z, 0.75, 0.35, _top + 0.65, _top + 1.3 + R.Range(-0.04, 0.04), a + Math.PI * 0.5);
            }
            return;
        }
        const rE = r * 1.24, y0 = _top - 0.15, prof = [];
        for (let k = 0; k <= 10; k++) {
            const t = k / 10;
            prof.push([rE * Math.pow(1 - t, 1.28), y0 + _t.roofH * t]);
        }
        CForgeTowerGen.Ring(B.cap, cx, cz, r * 0.95, r + 0.12, _top - 0.3, _top - 0.05, seg);
        CForgeTowerGen.Lathe(B.roof, cx, cz, prof, seg);
        CForgeTowerGen.Soffit(B.roof, cx, cz, r * 0.98, rE * 0.995, y0 - 0.02, seg);
        const ry = y0 + _t.roofH, fh = Math.max(0.5, r * 0.35);
        CForgeTowerGen.Lathe(B.metal, cx, cz, [[0.1, ry - 0.2], [0.1, ry + fh * 0.4], [0.16, ry + fh * 0.5], [0.1, ry + fh * 0.6], [0, ry + fh]], 8);
    }
    static RaisedDoor(B, _x, _z, _nx, _nz, _g, _y0) {
        const w = 1.1, ang = Math.atan2(_nx, -_nz), rise = _y0 - _g, land = 0.16 + 0.5;
        CForgeOpening.Door({ stone: B.stone, fill: B.wood, dark: B.dark, door: B.wood }, _x, _y0, _z, -_nz, _nx, _nx, _nz, w, 2.1, CForgeOpening.eKind.Round, 1);
        for (let k = 1; k <= 3; k++) {
            const o = land + 0.18 + (k - 1) * 0.34;
            CForgeShape.Box(B.stone, _x + _nx * o, _z + _nz * o, w + 0.6, 0.36, _g - 0.4, _y0 - rise * k / 4, ang);
        }
    }
    static Strut(_b, _p, _q, _w) {
        const dx = _q[0] - _p[0], dy = _q[1] - _p[1], dz = _q[2] - _p[2], l = Math.hypot(dx, dy, dz);
        if (l < 1e-4)
            return;
        const ax = dx / l, ay = dy / l, az = dz / l;
        let sx = -az, sy = 0, sz = ax, sl = Math.hypot(sx, sz);
        if (sl < 1e-3) {
            sx = 1;
            sz = 0;
            sl = 1;
        }
        sx /= sl;
        sz /= sl;
        const tx = sy * az - sz * ay, ty = sz * ax - sx * az, tz = sx * ay - sy * ax, h = _w * 0.5;
        const C = (_o, _a, _b2) => [_o[0] + (sx * _a + tx * _b2) * h, _o[1] + (sy * _a + ty * _b2) * h, _o[2] + (sz * _a + tz * _b2) * h];
        const uv = [[0, 0], [_w, 0], [_w, l], [0, l]];
        for (const [a0, b0, a1, b1, nx, ny, nz] of [[1, -1, 1, 1, sx, sy, sz], [1, 1, -1, 1, tx, ty, tz], [-1, 1, -1, -1, -sx, -sy, -sz], [-1, -1, 1, -1, -tx, -ty, -tz]])
            _b.Quad([C(_p, a0, b0), C(_p, a1, b1), C(_q, a1, b1), C(_q, a0, b0)], uv, [nx, ny, nz]);
    }
    static Watch(B, _t, _g, _top) {
        const [cx, cz] = _t.c, w = Math.min(4.5, Math.max(2.2, _t.r * 1.6)), h = w * 0.5, o = w * 0.5 + 0.5;
        const roofY = _top + 2.3, postTop = _t.flat ? _top + 1.1 : roofY, n = Math.max(1, Math.round((_top - _g) / 2.8));
        const corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
        for (const [x, z] of corners) {
            CForgeShape.Box(B.stone, cx + x, cz + z, 0.55, 0.55, _g - 0.3, _g + 0.22);
            CForgeShape.Box(B.wood, cx + x, cz + z, 0.3, 0.3, _g + 0.22, postTop);
        }
        for (let k = 0; k <= n; k++) {
            const y0 = _g + 0.4 + (_top - _g - 0.4) * (k - 1) / n, y1 = _g + 0.4 + (_top - _g - 0.4) * k / n;
            for (let i = 0; i < 4; i++) {
                const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4], ox = (ax + bx) * 0.5, oz = (az + bz) * 0.5, ol = Math.hypot(ox, oz) || 1, px = ox / ol * 0.2, pz = oz / ol * 0.2;
                CForgeTowerGen.Strut(B.wood, [cx + ax + px, y1, cz + az + pz], [cx + bx + px, y1, cz + bz + pz], 0.2);
                if (k == 0)
                    continue;
                const qx = px * 1.4, qz = pz * 1.4;
                CForgeTowerGen.Strut(B.wood, [cx + ax + qx, y0, cz + az + qz], [cx + bx + qx, y1, cz + bz + qz], 0.15);
                CForgeTowerGen.Strut(B.wood, [cx + bx + qx * 1.25, y0, cz + bz + qz * 1.25], [cx + ax + qx * 1.25, y1, cz + az + qz * 1.25], 0.15);
            }
        }
        CForgeShape.Box(B.plank, cx, cz, o * 2, o * 2, _top - 0.18, _top);
        for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            CForgeShape.Box(B.plank, cx + fx * (o - 0.05), cz + fz * (o - 0.05), fx != 0 ? 0.08 : o * 2, fx != 0 ? o * 2 : 0.08, _top, _top + 1.05);
        if (_t.flat)
            return;
        const sq = [[cx - h - 0.15, cz - h - 0.15], [cx + h + 0.15, cz - h - 0.15], [cx + h + 0.15, cz + h + 0.15], [cx - h - 0.15, cz + h + 0.15]];
        CForgeShape.Pyramid(B.roof, sq, roofY, (w + 1.4) * 0.45, 0.75);
    }
    static EastW(_t) { return _t.r * 1.8; }
    static EastA(_t) { return _t.attach.length > 0 ? _t.attach[0] : 0; }
    static JapaneseFloors(_t) {
        const w = CForgeTowerGen.EastW(_t);
        return _t.flat || w < 3 ? 1 : _t.floors >= 3 && w >= 4 ? 3 : 2;
    }
    static sJapaneseFloorH = 2.5;
    static Japanese(_t, _g, _top, T) {
        const [cx, cz] = _t.c, w = CForgeTowerGen.EastW(_t), ang = CForgeTowerGen.EastA(_t), sp = (_top - _g + 1) * 0.22;
        const stone = new CForgeMeshBuf(), Y = CForgeYaguraGen.Bufs();
        CForgeShape.Ishigaki(stone, cx, cz, w, sp, _g - 1.0, _top, ang);
        CForgeYaguraGen.Build(Y, cx, cz, Math.cos(ang), Math.sin(ang), w - 0.3, w - 0.3, _top + 0.02, CForgeTowerGen.JapaneseFloors(_t), CForgeTowerGen.sJapaneseFloorH);
        const parts = [{ buf: stone, rgb: T.mWallBody, tex: CForgeTex.sIshigaki }, ...CForgeYaguraGen.Parts(Y, T, _t.seed)];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static ChineseHall(_t) { const w = CForgeTowerGen.EastW(_t) - 1.0; return { L: w, D: w, h: 2.4, dbl: w >= 3.4 && CForgeTheme.Of(_t).mWallStyle != 1 }; }
    static Chinese(_t, _g, _top, T) {
        const [cx, cz] = _t.c, w = CForgeTowerGen.EastW(_t), ang = CForgeTowerGen.EastA(_t), ux = Math.cos(ang), uz = Math.sin(ang);
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), HB = CForgeChineseHallGen.Bufs();
        CForgeShape.Box(stone, cx, cz, w + 0.2, w + 0.2, _g - 1.0, _g + 0.7, ang);
        CForgeShape.Box(body, cx, cz, w, w, _g + 0.7, _top, ang);
        CForgeShape.Box(cap, cx, cz, w + 0.12, w + 0.12, _top - 0.12, _top, ang);
        for (const [fu, fv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv, x = cx + nx * (w * 0.5 - 0.15), z = cz + nz * (w * 0.5 - 0.15), a = Math.atan2(nz, nx) + Math.PI * 0.5;
            CForgeShape.Box(body, x, z, w, 0.3, _top, _top + 0.9, a);
            CForgeShape.Box(cap, x, z, w + 0.06, 0.38, _top + 0.88, _top + 0.96, a);
            const n = Math.max(2, Math.round(w / 1.5));
            for (let k = 0; k < n; k++) {
                const t = -w * 0.5 + w * (k + 0.5) / n, px = x - nz * t, pz = z + nx * t;
                CForgeShape.Box(body, px, pz, w / n - 0.5, 0.3, _top + 0.9, _top + 1.6, a);
                CForgeShape.Box(cap, px, pz, w / n - 0.42, 0.38, _top + 1.6, _top + 1.7, a);
                CForgeShape.Decal(dark, px + nx * 0.15, _top + 1.2, pz + nz * 0.15, -nz, nx, nx, nz, 0.18, 0.18);
            }
        }
        const H = CForgeTowerGen.ChineseHall(_t);
        CForgeChineseHallGen.Build(HB, cx, cz, ux, uz, H.L, H.D, _top + 0.37, H.h, H.dbl, T.mRoofLift);
        const parts = [
            { buf: body, rgb: T.mTowerBody, tex: T.mWallStyle == 1 ? CForgeTex.sHangtu : CForgeTex.sQingzhuan }, { buf: stone, rgb: T.mWallStone, tex: CForgeTex.sStone },
            { buf: cap, rgb: T.mWallCap, tex: T.mWallStyle == 1 ? CForgeTex.sHangtu : CForgeTex.sQingzhuan }, { buf: dark, rgb: T.mDark },
            ...CForgeChineseHallGen.Parts(HB, T, T.mRoof[_t.seed % T.mRoof.length]),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Korean(_t, _g, _top, T) {
        const [cx, cz] = _t.c, w = CForgeTowerGen.EastW(_t), ang = CForgeTowerGen.EastA(_t), ux = Math.cos(ang), uz = Math.sin(ang);
        const body = new CForgeMeshBuf(), stone = new CForgeMeshBuf(), cap = new CForgeMeshBuf(), dark = new CForgeMeshBuf(), P = CForgePavilionGen.Bufs();
        CForgeShape.Box(stone, cx, cz, w + 0.3, w + 0.3, _g - 1.0, _g + 0.7, ang);
        CForgeShape.Box(body, cx, cz, w, w, _g + 0.7, _top, ang);
        CForgeShape.Box(stone, cx, cz, w + 0.24, w + 0.24, _top - 0.16, _top, ang);
        for (const [fu, fv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = ux * fu - uz * fv, nz = uz * fu + ux * fv, x = cx + nx * (w * 0.5 - 0.2), z = cz + nz * (w * 0.5 - 0.2), a = Math.atan2(nz, nx) + Math.PI * 0.5;
            CForgeShape.Box(body, x, z, w, 0.4, _top, _top + 0.8, a);
            CForgeShape.Box(cap, x, z, w + 0.2, 0.6, _top + 0.8, _top + 0.9, a);
            for (const f of [-0.25, 0.25])
                CForgeShape.Decal(dark, x + nx * 0.2 + nz * f * w, _top + 0.45, z + nz * 0.2 - nx * f * w, -nz, nx, nx, nz, 0.18, 0.2);
        }
        const pw = Math.max(2.4, w - 1.2);
        CForgePavilionGen.Build(P, cx, cz, ux, uz, pw, pw, _top + 0.17, 2.3, false, 0.85);
        const parts = [
            { buf: body, rgb: T.mTowerBody, tex: T.mWallStyle == 1 ? CForgeTex.sHangtu : CForgeTex.sSeongdol }, { buf: stone, rgb: T.mWallStone, tex: T.mWallStyle == 1 ? CForgeTex.sStone : CForgeTex.sSeongdol },
            { buf: cap, rgb: T.mWallCap, tex: CForgeTex.sGiwa }, { buf: dark, rgb: T.mDark }, ...CForgePavilionGen.Parts(P, T, _t.seed),
        ];
        return parts.filter(_p => _p.buf.mIdx.length > 0);
    }
    static Square(B, _t, _g, _top) {
        const [cx, cz] = _t.c, r = _t.r, w = r * 1.8, R = new CForgeRand(_t.seed);
        CForgeShape.Box(B.stone, cx, cz, w * 1.12, w * 1.12, _g - 1.0, _g + 1.2);
        CForgeShape.Box(B.body, cx, cz, w, w, _g + 1.2, _top);
        for (let k = 1; k < _t.floors; k++) {
            const y = _g + _t.height * k / _t.floors;
            CForgeShape.Box(B.stone, cx, cz, w + 0.2, w + 0.2, y - 0.12, y + 0.12);
        }
        const faces = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        for (let k = 0; k < _t.floors; k++) {
            const y = _g + _t.height * (k + 0.45) / _t.floors;
            for (const [fx, fz] of faces) {
                const a = Math.atan2(fz, fx);
                if (!CForgeTowerGen.Free(_t, a, 0.6))
                    continue;
                const cxF = cx + fx * w * 0.5, czF = cz + fz * w * 0.5;
                const OB = { stone: B.stone, fill: B.dark, dark: B.dark };
                if (k == 0)
                    CForgeOpening.Slit(OB, cxF, Math.max(y, _g + 1.8), czF, -fz, fx, fx, fz, 0.17, 0.9);
                else
                    CForgeOpening.Window(OB, cxF, y - 0.6, czF, -fz, fx, fx, fz, 0.6, 1.2, CForgeOpening.eKind.Round, true);
            }
        }
        if (_t.door != null) {
            const fx = Math.round(Math.cos(_t.door)), fz = fx != 0 ? 0 : Math.sign(Math.sin(_t.door));
            CForgeTowerGen.RaisedDoor(B, cx + fx * w * 0.5, cz + fz * w * 0.5, fx, fz, _g, _g + 1.2);
        }
        const sq = [[cx - w / 2, cz - w / 2], [cx + w / 2, cz - w / 2], [cx + w / 2, cz + w / 2], [cx - w / 2, cz + w / 2]];
        if (_t.flat) {
            CForgeShape.Box(B.stone, cx, cz, w + 0.4, w + 0.4, _top - 0.4, _top + 0.1);
            CForgeShape.Cap(B.stone, sq, _top + 0.12);
            const n = Math.max(2, Math.round(w / 1.35));
            for (const [fx, fz] of faces)
                for (let k = 0; k < n; k++) {
                    const u = (k + 0.5) / n - 0.5, x = cx + fx * (w * 0.5 + 0.03) - fz * u * w, z = cz + fz * (w * 0.5 + 0.03) + fx * u * w, a = Math.atan2(fx, -fz);
                    if (CForgeTheme.Of(_t).mWallStyle == 1) {
                        CForgeShape.Box(B.body, x, z, 0.7, 0.32, _top + 0.1, _top + 0.7, a);
                        for (const sg of [-1, 1])
                            CForgeShape.Box(B.body, x + Math.cos(a) * sg * 0.24, z + Math.sin(a) * sg * 0.24, 0.22, 0.32, _top + 0.7, _top + 1.15, a);
                    }
                    else
                        CForgeShape.Box(B.body, x, z, 0.7, 0.32, _top + 0.1, _top + 0.85 + R.Range(-0.04, 0.04), a);
                }
            return;
        }
        CForgeShape.Pyramid(B.roof, sq, _top, _t.roofH, 0.35);
    }
}
