import { NameHash, WHITE } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectPiece, SetAlpha, SetPos, SetSize } from "./CEffectPiece.js";
import { CEffectPrim, HexRGB } from "./CEffectPrim.js";
import { CEffectSubject } from "./CEffectSubject.js";
const H = HexRGB;
export class CEffectRing2 extends CEffectSubject {
    mRing;
    mMuzzle = false;
    Build(_o) {
        this.mMuzzle = _o.kind == "muzzle";
        this.mRing = CEffectPiece.Ring(this, this.mColor, false, this.mColor);
    }
    Tick(_r) {
        const rr = this.mMuzzle ? 4 + 12 * _r : 5 + 26 * _r;
        this.mRing.Place(0, 0, rr, rr, 0.85 * (1 - _r), 2 * (1 - _r) + 1);
    }
}
export class CEffectPulseRings extends CEffectSubject {
    mRings = [];
    mRadius = 170;
    Build(_o) {
        this.mRadius = _o.radius || 170;
        for (let e = 0; e < 2; e++)
            this.mRings.push(CEffectPiece.Ring(this, this.mColor, false, this.mColor));
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        for (let e = 0; e < 2; e++) {
            const t = 8 + clamp(_r - 0.15 * e, 0, 1) * Math.min(185, this.mRadius);
            this.mRings[e].Place(0, 0, t, 0.7 * t, a, 3);
        }
    }
}
export class CEffectSummon extends CEffectSubject {
    mRing;
    mBar;
    Build() {
        const c = H("#e5dfc0");
        this.mRing = CEffectPiece.Ring(this, c, false, c);
        this.mBar = CEffectPrim.Solid(4, 10, true);
        CEffectPrim.Tint(this.mBar, H("#fff5ce"));
        this.PushComp(this.mBar);
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        this.mRing.Place(0, 0, 15 + 33 * _r, 8 + 17 * _r, a);
        const h = Math.max(1, 55 * (1 - _r));
        SetPos(this.mBar, 0, h / 2);
        SetSize(this.mBar, 4, h);
        SetAlpha(this.mBar, clamp(a, 0, 1));
    }
}
export class CEffectSelfRing extends CEffectSubject {
    mRing;
    mDots = [];
    Build() {
        this.mRing = CEffectPiece.Ring(this, this.mColor, false, this.mColor);
        for (let e = 0; e < 3; e++) {
            const d = CEffectPrim.Solid(3, 5, false);
            CEffectPrim.Tint(d, this.mColor);
            this.PushComp(d);
            this.mDots.push(d);
        }
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        this.mRing.Place(0, -25 * _r, 18 + 8 * Math.sin(_r * Math.PI), 9, a);
        for (let e = 0; e < 3; e++) {
            SetPos(this.mDots[e], 17 * Math.cos(2.1 * e) + 1.5, 45 * _r + 3 * e - 2.5);
            SetAlpha(this.mDots[e], clamp(a * 0.27, 0.01, 1));
        }
    }
}
export class CEffectSlashArc extends CEffectSubject {
    static kSeg = 9;
    mArcs = [];
    mWhite = [];
    mN = 1;
    Build(_o) {
        this.mN = _o.family == "slash" ? 3 : 1;
        const c = this.mColor;
        for (let e = 0; e < this.mN; e++) {
            this.mArcs.push(Array.from({ length: CEffectSlashArc.kSeg }, () => CEffectPiece.Line(this, c, false, c)));
            this.mWhite.push(Array.from({ length: CEffectSlashArc.kSeg }, () => CEffectPiece.Line(this, H("#fffce9"), false, c)));
        }
    }
    Tick(_r) {
        const N = CEffectSlashArc.kSeg, a = 0.85 * (1 - _r);
        const R = 32 + 45 * _r, a0 = 0.6 * _r - 1.05, a1 = 1.05 + 0.6 * _r;
        for (let e = 0; e < this.mN; e++) {
            const cy = 10 * (e - (this.mN - 1) / 2);
            for (let k = 0; k < N; k++) {
                const t0 = a0 + (a1 - a0) * k / N, t1 = a0 + (a1 - a0) * (k + 1) / N;
                const ax = Math.cos(t0) * R, ay = Math.sin(t0) * R + cy, bx = Math.cos(t1) * R, by = Math.sin(t1) * R + cy;
                this.mArcs[e][k].Place(ax, ay, bx, by, 5 * (1 - _r) + 1, a);
                this.mWhite[e][k].Place(ax, ay, bx, by, 1.5, a);
            }
        }
    }
}
export class CEffectSlashFist extends CEffectSubject {
    mFist;
    Build() {
        this.mFist = CEffectPiece.Sprite(this, "fist", 1, this.mColor, false, 0.01, WHITE, this.mColor);
    }
    Tick(_r) {
        this.mFist.Place(25 + 38 * _r, 10, 0, 1 + 0.4 * _r, 0.85 * (1 - _r));
    }
}
export class CEffectSlashCharge extends CEffectSubject {
    mLines = [];
    mStar;
    Build() {
        const c = this.mColor;
        for (let e = 0; e < 3; e++)
            this.mLines.push(CEffectPiece.Line(this, c, false, c, 80));
        this.mStar = CEffectPiece.Sprite(this, "star6", 1, H("#ffedbf"), true, 0.01, null, c);
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        for (let e = 0; e < 3; e++) {
            const o = 15 * (e - 1);
            this.mLines[e].Place(-15 - 15 * _r, o, 30 + 45 * _r, 0.4 * o, 3, a);
        }
        this.mStar.Place(30 + 45 * _r, 0, 0, 15 * (1 - _r) + 4, a);
    }
}
export class CEffectSlashClaw extends CEffectSubject {
    mClaws = [];
    Build() {
        for (let i = 0; i < 2; i++)
            this.mClaws.push(CEffectPiece.Sprite(this, "claw", 1, this.mColor, false, 0.01, WHITE, this.mColor));
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        [-1, 1].forEach((e, i) => { this.mClaws[i].Place(35, -e * (6 + 18 * _r), e > 0 ? 0 : Math.PI, 1, a); });
    }
}
export class CEffectPulseQuake extends CEffectSubject {
    mSp = [];
    mRocks = [];
    mRad = 170;
    Build(_o) {
        this.mRad = _o.radius || 170;
        const len = this.mRad * 0.6;
        for (let o = 0; o < 10; o++)
            this.mSp.push([CEffectPiece.Line(this, H("#ead3a0"), false, false, len), CEffectPiece.Line(this, H("#ead3a0"), false, false, len)]);
        for (let o = 0; o < 10; o++)
            this.mRocks.push(CEffectPiece.Sprite(this, "chunk", 1, H("#bda77f"), false, 0.01, H("#e1d3b1"), null));
    }
    Tick(_r) {
        const n = 8 + _r * this.mRad, a = 0.85 * (1 - _r), lw = 3 * (1 - _r) + 1;
        for (let o = 0; o < 10; o++) {
            const ang = o * Math.PI * 2 / 10, s = Math.cos(ang), f = Math.sin(ang);
            this.mSp[o][0].Place(18 * s, 18 * f, s * n * 0.55 + 10 * f, f * n * 0.55 - 10 * s, lw, a);
            this.mSp[o][1].Place(s * n * 0.55 + 10 * f, f * n * 0.55 - 10 * s, s * n, f * n, lw, a);
            if (_r < 0.7)
                this.mRocks[o].Place(s * n * 0.65, -(f * n * 0.65 - 12 * Math.sin(_r * Math.PI)), 0, 1, a);
            else
                this.mRocks[o].Place(0, 0, 0, 1, 0);
        }
    }
}
export class CEffectPulseLightning extends CEffectSubject {
    mL = [];
    mRad = 170;
    Build(_o) {
        this.mRad = _o.radius || 170;
        const len = this.mRad / 5 + 8;
        for (let o = 0; o < 12; o++)
            this.mL.push(Array.from({ length: 5 }, () => CEffectPiece.Line(this, H("#fff0a9"), false, this.mColor, len)));
    }
    Tick(_r, _now) {
        const n = 8 + _r * this.mRad, a = 0.85 * (1 - _r);
        for (let o = 0; o < 12; o++) {
            const ang = o * Math.PI * 2 / 12;
            let px = 15 * Math.cos(ang), py = 15 * Math.sin(ang);
            for (let e = 1; e <= 5; e++) {
                const l = e * n / 5, s = ang + 0.1 * Math.sin(0.05 * _now + 3 * o + e);
                const nx = Math.cos(s) * l, ny = Math.sin(s) * l;
                this.mL[o][e - 1].Place(px, py, nx, ny, 2, a);
                px = nx;
                py = ny;
            }
        }
    }
}
export class CEffectPulseFairy extends CEffectSubject {
    mRing;
    mStars = [];
    mRad = 170;
    Build(_o) {
        this.mRad = _o.radius || 170;
        this.mRing = CEffectPiece.Ring(this, this.mColor, false, this.mColor);
        for (let o = 0; o < 8; o++)
            this.mStars.push(CEffectPiece.Sprite(this, "star4", 1, H("#fff0fa"), false, 0.01, this.mColor, this.mColor));
    }
    Tick(_r) {
        const n = 8 + _r * this.mRad, a = 0.85 * (1 - _r);
        this.mRing.Place(0, 0, n, n, a);
        for (let o = 0; o < 8; o++) {
            const ang = o * Math.PI * 2 / 8 + _r;
            this.mStars[o].Place(Math.cos(ang) * n * 0.8, -Math.sin(ang) * n * 0.8, ang, 4 + 8 * (1 - _r), a);
        }
    }
}
export class CEffectPulseDefault extends CEffectSubject {
    mRings = [];
    mRad = 170;
    mLw = 2;
    Build(_o) {
        this.mRad = _o.radius || 170;
        this.mLw = _o.family == "sound" ? 2.5 : 2;
        for (let o = 0; o < 3; o++)
            this.mRings.push(CEffectPiece.Ring(this, o % 2 ? H("#fff5e9") : this.mColor, false, this.mColor));
    }
    Tick(_r) {
        const n = 8 + _r * this.mRad, a = 0.85 * (1 - _r);
        for (let o = 0; o < 3; o++) {
            const rr = Math.max(1, n - 20 * o);
            this.mRings[o].Place(0, 0, rr, rr, a, this.mLw);
        }
    }
}
export class CEffectSelfSpeed extends CEffectSubject {
    mL = [];
    Build() {
        for (let i = 0; i < 6; i++)
            this.mL.push([CEffectPiece.Line(this, H("#bfe8ff"), false, this.mColor), CEffectPiece.Line(this, H("#bfe8ff"), false, this.mColor)]);
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        let k = 0;
        for (const e of [-1, 1])
            for (let o = 0; o < 3; o++) {
                const x = e * (23 + 10 * o + 13 * _r), y = 4 * o - 10;
                this.mL[k][0].Place(x - 6 * e, y - 8, x, y, 3, a);
                this.mL[k][1].Place(x, y, x - 6 * e, y + 8, 3, a);
                k++;
            }
    }
}
export class CEffectSelfProtect extends CEffectSubject {
    mShield;
    Build() {
        this.mShield = CEffectPiece.Sprite(this, "shield", 1, WHITE, true, 0.01, null, this.mColor);
    }
    Tick(_r) {
        this.mShield.Place(0, 0, 0, 1, 0.85 * (1 - _r));
    }
}
export class CEffectSelfSwords extends CEffectSubject {
    mSw = [];
    Build() {
        for (let o = 0; o < 3; o++)
            this.mSw.push(CEffectPiece.Sprite(this, "sword", 1, WHITE, false, 0.01, null, this.mColor));
    }
    Tick(_r) {
        for (let o = 0; o < 3; o++) {
            const l = o * Math.PI * 2 / 3 + 2 * _r;
            this.mSw[o].Place(31 * Math.cos(l), -(14 * Math.sin(l) - 20 - 16 * _r), -0.2, 1, 0.85 * (1 - _r));
        }
    }
}
export class CEffectSelfHeal extends CEffectSubject {
    mPl = [];
    Build() {
        for (let o = 0; o < 5; o++)
            this.mPl.push(CEffectPiece.Sprite(this, "plus", 1, WHITE, false, 0.01, null, this.mColor));
    }
    Tick(_r) {
        for (let o = 0; o < 5; o++) {
            const a = o * Math.PI * 2 / 5;
            this.mPl[o].Place(25 * Math.cos(a), -(12 * Math.sin(a) - 45 * _r), 0, 1, 0.85 * (1 - _r));
        }
    }
}
export class CEffectSelfRings extends CEffectSubject {
    mRings = [];
    Build() {
        for (let o = 0; o < 3; o++)
            this.mRings.push(CEffectPiece.Ring(this, this.mColor, false, this.mColor));
    }
    Tick(_r) {
        const a = 0.85 * (1 - _r);
        for (let o = 0; o < 3; o++)
            this.mRings[o].Place(0, -40 * _r + 11 * o, 22, 10, a);
    }
}
export class CEffectImpactRock extends CEffectSubject {
    mRk = [];
    Build() {
        for (let o = 0; o < 7; o++)
            this.mRk.push(CEffectPiece.Sprite(this, "chip", 1, this.mColor, false, 0.01, H("#e9dabd"), null));
    }
    Tick(_r) {
        for (let o = 0; o < 7; o++) {
            const l = o * Math.PI * 2 / 7, s = 32 * _r;
            this.mRk[o].Place(Math.cos(l) * s, -(Math.sin(l) * s - 14 * Math.sin(_r * Math.PI)), -(l + 3 * _r), 1, 0.85 * (1 - _r));
        }
    }
}
export class CEffectImpactDrop extends CEffectSubject {
    mBb = [];
    Build() {
        for (let o = 0; o < 8; o++)
            this.mBb.push(CEffectPiece.Sprite(this, "dot", 1, this.mColor, false, 0.01, WHITE, this.mColor));
    }
    Tick(_r) {
        for (let o = 0; o < 8; o++) {
            const a = o * Math.PI * 2 / 8, s = 10 + 30 * _r;
            this.mBb[o].Place(Math.cos(a) * s, -(Math.sin(a) * s - 9 * Math.sin(_r * Math.PI)), 0, 4 * (1 - _r) + 1, 0.85 * (1 - _r));
        }
    }
}
export class CEffectImpactStar extends CEffectSubject {
    mStar;
    mVariant = 0;
    Build(_o) {
        this.mVariant = NameHash(_o.name) % 5;
        const key = ["lightning", "electricorb"].includes(_o.family) ? "star8" : "star6";
        this.mStar = CEffectPiece.Sprite(this, key, 1, this.mColor, false, 0.01, H("#fff7e8"), this.mColor);
    }
    Tick(_r) {
        this.mStar.Place(0, 0, -0.5 * this.mVariant, 9 + 29 * _r, 0.85 * (1 - _r));
    }
}
CEffectMgr.Register("ring2", () => new CEffectRing2(), 0.35);
CEffectMgr.Register("pulseRings", () => new CEffectPulseRings(), 0.5);
CEffectMgr.Register("summon", () => new CEffectSummon(), 0.55);
CEffectMgr.Register("selfRing", () => new CEffectSelfRing(), 0.35);
CEffectMgr.Register("slash", (_o) => {
    const fam = _o.family || "", name = (_o.name || "");
    if (fam == "fist" || name.includes("punch"))
        return new CEffectSlashFist();
    if (fam == "charge")
        return new CEffectSlashCharge();
    if (fam == "dark")
        return new CEffectSlashClaw();
    return new CEffectSlashArc();
}, 0.28);
CEffectMgr.Register("pulse", (_o) => {
    const fam = _o.family || "";
    if (fam == "quake")
        return new CEffectPulseQuake();
    if (fam == "lightning")
        return new CEffectPulseLightning();
    if (fam == "fairy")
        return new CEffectPulseFairy();
    return new CEffectPulseDefault();
}, 0.52);
CEffectMgr.Register("self", (_o) => {
    const fam = _o.family || "";
    if (fam == "speed")
        return new CEffectSelfSpeed();
    if (fam == "protect")
        return new CEffectSelfProtect();
    if (fam == "swords")
        return new CEffectSelfSwords();
    if (fam == "heal")
        return new CEffectSelfHeal();
    return new CEffectSelfRings();
}, 0.65);
CEffectMgr.Register("impact", (_o) => {
    const fam = _o.family || "";
    if (["rock", "quake", "meteor", "stone"].includes(fam))
        return new CEffectImpactRock();
    if (["waterjet", "bubbles", "wave", "waterpulse", "sludge", "toxic"].includes(fam))
        return new CEffectImpactDrop();
    return new CEffectImpactStar();
}, 0.35);
export class CEffectSimpleRing extends CEffectSubject {
    mPt;
    mS0 = 0.15;
    mS1 = 1;
    Build(_o) {
        this.mS0 = _o.scaleStart ?? 0.15;
        this.mS1 = _o.scaleEnd ?? 1;
        this.mPt = CEffectPrim.Ring(this.mSize, this.mSize, this.mColor, 0.5);
        this.PushComp(this.mPt);
    }
    Tick(_r) {
        const s = (this.mS0 + (this.mS1 - this.mS0) * _r) * this.mSize;
        SetSize(this.mPt, s, s);
        SetAlpha(this.mPt, 0.8 * (1 - _r));
    }
}
export class CEffectSimpleGlow extends CEffectSubject {
    mPt;
    Build() {
        this.mPt = CEffectPrim.Glow(this.mSize, this.mSize, this.mColor, 0.6);
        this.PushComp(this.mPt);
    }
    Tick(_r) {
        const s = (1 - 0.75 * _r) * this.mSize;
        SetSize(this.mPt, s, s);
        SetAlpha(this.mPt, 1 - _r);
    }
}
CEffectMgr.Register("ring", () => new CEffectSimpleRing(), 0.4);
CEffectMgr.Register("glow", () => new CEffectSimpleGlow(), 0.4);
