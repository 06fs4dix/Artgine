import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectPiece, SetAlpha, SetPos, SetSize, SetTint, Take } from "./CEffectPiece.js";
import { CEffectPrim, HexRGB } from "./CEffectPrim.js";
import { CEffectShape } from "./CEffectShape.js";
import { CEffectSubject } from "./CEffectSubject.js";
const K = 128 / 60;
const PALETTE = ["#97a2ac", "#cbd3ce", "#60717e"];
export class CEffectDebrisPiece extends CSubject {
    mShadow;
    mBody;
    mTop;
    mTurn;
    mA = -1;
    constructor() {
        super();
        this.mShadow = CEffectShape.PaintWH("ell", 1, 1, HexRGB("#101824"));
        SetAlpha(this.mShadow, 0.31);
        this.PushComp(this.mShadow);
        this.mTurn = new CSubject();
        this.mBody = CEffectPrim.Solid(1, 1, false);
        this.mTop = CEffectPrim.Solid(1, 1, false);
        this.mTop.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBMul));
        this.mTurn.PushComp(this.mBody);
        this.mTurn.PushComp(this.mTop);
        this.PushChild(this.mTurn);
    }
    Config(_rgb, _size) {
        this.SetEnable(true);
        this.mBody.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        this.mBody.SetSize(new CVec2(_size, _size * 0.7));
        this.mBody.SetPos(new CVec3(0, _size * 0.15, 0));
        this.mTop.SetSize(new CVec2(_size, 1));
        this.mTop.SetPos(new CVec3(0, _size * 0.5 - 0.5, 0.001));
        this.mShadow.SetSize(new CVec2(_size * K, _size * 0.4 * K));
        this.mA = -1;
    }
    Place(_x, _y, _z, _angle, _alpha) {
        this.SetPos(new CVec3(_x, _y, 0));
        this.mTurn.SetPos(new CVec3(0, _z, 0.01));
        this.mTurn.SetRot(new CVec3(0, 0, -_angle));
        const a = Math.round(_alpha * 10) / 10;
        if (a != this.mA) {
            this.mA = a;
            SetAlpha(this.mBody, Math.max(0.03, a));
            SetAlpha(this.mTop, Math.max(0.03, a * 0.4));
        }
    }
}
const TakeDebris = () => Take("fxDebris", () => new CEffectDebrisPiece());
export class CEffectDebris extends CEffectSubject {
    mPieces = [];
    mLast = 0;
    Build(_o) {
        const big = !!_o.big, w = _o.width ?? 40, h = _o.height ?? 40;
        const pal = _o.palette ?? PALETTE;
        const seed = _o.seed ?? 0;
        const n = big ? 22 : 7;
        for (let a = 0; a < n; a++) {
            const ang = 2.39996 * a + seed, l = (big ? 45 : 20) + (a % 5) * 13;
            const size = big ? 4 + (a % 6) : 2 + (a % 4);
            const piece = TakeDebris();
            piece.Config(HexRGB(pal[a % 3]), size);
            this.PushChild(piece);
            this.mPieces.push({
                piece,
                x: big ? ((a % 5) - 2) * w * 0.13 : 0, y: big ? -((a % 3) - 1) * h * 0.12 : 0, z: 6 + (a % 4) * 4,
                vx: Math.cos(ang) * l, vy: -Math.sin(ang) * l * 0.65, vz: 75 + (a % 5) * 13,
                angle: ang, spin: (a % 2 ? 1 : -1) * (2 + (a % 4)),
                size, life: big ? 1.2 + (a % 4) * 0.16 : 0.5 + (a % 3) * 0.1,
            });
        }
        this.mLife = Math.max(...this.mPieces.map(p => p.life));
        this.mLast = performance.now();
    }
    Tick(_r, _now) {
        const dt = Math.min(0.05, (_now - this.mLast) / 1000);
        this.mLast = _now;
        for (const p of this.mPieces) {
            if (p.life <= 0) {
                p.piece.SetEnable(false);
                continue;
            }
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vz -= 260 * dt;
            p.angle += p.spin * dt;
            if (p.z < 0) {
                p.z = 0;
                p.vz = 0.28 * Math.abs(p.vz);
                p.vx *= 0.72;
                p.vy *= 0.72;
            }
            p.piece.Place(p.x, p.y, p.z, p.angle, Math.min(1, p.life / 0.35));
        }
    }
}
export class CEffectDust extends CEffectSubject {
    mPt;
    mSz = 5;
    mDx = 0;
    mDy = 0;
    Build(_o) {
        this.mSz = _o.size ?? 5;
        this.mDx = _o.driftX ?? 0;
        this.mDy = _o.driftY ?? 0;
        this.mPt = CEffectShape.PaintWH("ell", 1, 1, this.mColor);
        this.PushComp(this.mPt);
    }
    Tick(_r) {
        SetPos(this.mPt, this.mDx * _r, this.mDy * _r + 3 + 5 * _r);
        SetSize(this.mPt, this.mSz * (1 + _r) * K, this.mSz * (0.55 + 0.4 * _r) * K);
        SetAlpha(this.mPt, clamp(0.46 * (1 - _r), 0.01, 1));
    }
}
export class CEffectDecal extends CEffectSubject {
    mParts = [];
    mLines = [];
    Hex(_h) {
        return { c: HexRGB(_h.substr(0, 7)), a: _h.length > 7 ? parseInt(_h.substr(7, 2), 16) / 255 : 1 };
    }
    Ell(_rx, _ry, _ox, _oy, _hex) {
        const h = this.Hex(_hex);
        const pt = CEffectShape.PaintWH("ell", 1, 1, h.c);
        SetPos(pt, _ox, -_oy);
        SetSize(pt, Math.max(1, _rx * K), Math.max(1, _ry * K));
        this.PushComp(pt);
        this.mParts.push({ pt, a: h.a });
    }
    Seg(_ax, _ay, _bx, _by, _w, _hex, _hot = false) {
        const h = this.Hex(_hex);
        const line = CEffectPiece.Line(this, h.c, false, false, Math.hypot(_bx - _ax, _by - _ay));
        line.Place(_ax, _ay, _bx, _by, _w, 1);
        this.mLines.push({ line, a: h.a, hot: _hot });
    }
    Build(_o) {
        const kind = _o.kind ?? "crack", size = _o.size ?? 18, poison = !!_o.poison;
        const seed = _o.seed ?? 1;
        const rnd = (i) => { const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return s - Math.floor(s); };
        const marks = _o.marks
            ?? Array.from({ length: 7 }, (_, t) => ({ angle: t * Math.PI * 2 / 7 + 0.3 * (rnd(t * 3) - 0.5), length: 0.55 + 0.45 * rnd(t * 3 + 1), width: 2 + 4 * rnd(t * 3 + 2) }));
        if (kind == "skid") {
            this.Seg(0, -3, size, -3, 1.2, "#0f182d");
            this.Seg(0, 3, 0.85 * size, 3, 1.2, "#0f182d");
        }
        else if (kind == "splash") {
            this.Ell(size, 0.54 * size, 0, 0, poison ? "#734783" : "#5688a699");
            for (const m of marks)
                this.Ell(m.width, 0.5 * m.width, Math.cos(m.angle) * size * m.length, Math.sin(m.angle) * size * m.length * 0.6, poison ? "#ae80bc99" : "#a8dce299");
        }
        else if (kind == "scorch") {
            this.Ell(size, 0.66 * size, 0, 0, "#14151dc9");
            this.Ell(0.66 * size, 0.45 * size, 2, 0, "#291d2588");
            for (const m of marks)
                this.Seg(Math.cos(m.angle) * size * 0.6, Math.sin(m.angle) * size * 0.38, Math.cos(m.angle) * size * m.length * 1.35, Math.sin(m.angle) * size * m.length * 0.85, 0.45 * m.width, "#dc8a5288", true);
        }
        else {
            const col = kind == "frost" ? "#a5d4e199" : "#131c2fbf", lw = kind == "frost" ? 1.5 : 1.2;
            for (const m of marks) {
                const t = size * m.length;
                const mx = Math.cos(m.angle + 0.12) * t * 0.55, my = Math.sin(m.angle + 0.12) * t * 0.45;
                this.Seg(0, 0, mx, my, lw, col);
                this.Seg(mx, my, Math.cos(m.angle) * t, Math.sin(m.angle) * t * 0.7, lw, col);
                this.Seg(mx, my, Math.cos(m.angle + 0.65) * t * 0.78, Math.sin(m.angle + 0.65) * t * 0.56, lw, col);
            }
        }
    }
    Tick(_r) {
        const a = 0.62 * Math.min(1, (this.mLife * (1 - _r)) / 1.8);
        const cooled = this.mLife * (1 - _r) <= 3.4;
        for (const p of this.mParts)
            SetAlpha(p.pt, clamp(a * p.a, 0.01, 1));
        for (const l of this.mLines) {
            if (l.hot && cooled && l.a > 0.5) {
                l.a = 0.667;
                SetTint(l.line.mRect, HexRGB("#171d29"));
            }
            l.line.SetOpacity(clamp(a * l.a, 0.01, 1));
        }
    }
}
CEffectMgr.Register("debris", () => new CEffectDebris(), 1.6);
CEffectMgr.Register("dust", () => new CEffectDust(), 0.5);
CEffectMgr.Register("decal", () => new CEffectDecal(), 4);
