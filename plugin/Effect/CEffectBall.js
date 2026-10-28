import { lerp } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectPiece, SetAlpha, SetPos, SetSize } from "./CEffectPiece.js";
import { HexRGB } from "./CEffectPrim.js";
import { CEffectShape } from "./CEffectShape.js";
import { CEffectSubject } from "./CEffectSubject.js";
const K = 128 / 60;
export class CEffectBallThrow extends CEffectSubject {
    mShadow;
    mBall;
    mGhosts = [];
    mDx = 120;
    mDy = 0;
    Build(_o) {
        this.mDx = _o.dx ?? 120;
        this.mDy = _o.dy ?? 0;
        this.mShadow = CEffectShape.PaintWH("ell", 7, 3, HexRGB("#102236"));
        SetAlpha(this.mShadow, 0.33);
        this.PushComp(this.mShadow);
        this.mBall = CEffectPiece.Sprite(this, "ball", 1, null, false, 0.34);
        for (let e = 0; e < 3; e++)
            this.mGhosts.push(CEffectPiece.Sprite(this, "ball", 1, null, false, 0.33));
    }
    Tick(_r) {
        const x = lerp(0, this.mDx, _r), y = lerp(0, this.mDy, _r);
        SetPos(this.mShadow, x, y, 0.001);
        const sh = 7 - 3 * Math.sin(_r * Math.PI);
        SetSize(this.mShadow, sh * K, 3 * K);
        this.mBall.Place(x, y + 75 * Math.sin(_r * Math.PI) + 5, -_r * Math.PI * 2 * 1.5, 0.9, 1);
        for (let e = 1; e <= 3; e++) {
            const s = Math.max(0, _r - 0.018 * e);
            this.mGhosts[e - 1].Place(lerp(0, this.mDx, s), lerp(0, this.mDy, s) + 75 * Math.sin(s * Math.PI) + 5, -s * Math.PI * 2 * 1.5, 0.9, 0.055 * (4 - e));
        }
    }
}
export class CEffectBallOpen extends CEffectSubject {
    mGlow;
    mRing;
    mDots = [];
    mTop;
    mBot;
    Build() {
        this.mGlow = CEffectShape.PaintWH("ballglow", 1, 1, null, true);
        this.PushComp(this.mGlow);
        this.mRing = CEffectPiece.Ring(this, [0.78, 0.91, 1], true);
        for (let i = 0; i < 8; i++)
            this.mDots.push(CEffectPiece.Sprite(this, "dot", 1, [1, 0.98, 0.76], true, 0.34));
        this.mTop = CEffectPiece.Sprite(this, "balltop", 1, null, false, 0.34);
        this.mBot = CEffectPiece.Sprite(this, "ballbot", 1, null, false, 0.34);
    }
    Tick(_e) {
        const rad = 44 * (1 - _e) + 15;
        SetPos(this.mGlow, 0, 12, 0.33);
        SetSize(this.mGlow, rad * K, rad * K);
        SetAlpha(this.mGlow, clamp(0.8 * (1 - _e), 0.01, 1));
        this.mRing.Place(0, -4, 12 + 40 * _e, 5 + 18 * _e, clamp(0.9 * (1 - _e), 0.01, 1), 2);
        for (let t = 0; t < 8; t++) {
            const a = t * Math.PI * 2 / 8, s = 10 + 45 * _e;
            this.mDots[t].Place(Math.cos(a) * s, 12 - Math.sin(a) * s * 0.65, 0, 1, 1 - _e);
        }
        const so = Math.sin(_e * Math.PI);
        this.mTop.Place(0, -2 + 5 * so, 0, 0.9, 1 - _e);
        this.mBot.Place(0, -2 - 3 * so, 0, 0.9, 1 - _e);
    }
}
CEffectMgr.Register("ballThrow", () => new CEffectBallThrow(), 0.55);
CEffectMgr.Register("ballOpen", () => new CEffectBallOpen(), 0.5);
