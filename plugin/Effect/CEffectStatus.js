import { CEffectMgr } from "./CEffectMgr.js";
import { CEffectPiece } from "./CEffectPiece.js";
import { HexRGB } from "./CEffectPrim.js";
import { CEffectSubject } from "./CEffectSubject.js";
const H = HexRGB;
export class CEffectStatusFrz extends CEffectSubject {
    mIce;
    mDots = [];
    Build() {
        this.mIce = CEffectPiece.Sprite(this, "iceblock", 1, null, false, 0.4);
        for (let i = 0; i < 3; i++)
            this.mDots.push(CEffectPiece.Sprite(this, "dot", 1, H("#d6fbff"), false, 0.41));
    }
    Tick(_r, _now) {
        const a = _now / 1000;
        this.mIce.Place(0, 0, 0, 1, 1);
        for (let e = 0; e < 3; e++)
            this.mDots[e].Place(32 * Math.sin(0.7 * a + 2 * e), 15 + 33 * Math.cos(0.8 * a + 2 * e), 0, 1, 0.73);
    }
}
export class CEffectStatusBrn extends CEffectSubject {
    mFlames = [];
    Build() {
        for (let i = 0; i < 4; i++)
            this.mFlames.push(CEffectPiece.Sprite(this, "drop", 1, H(i % 2 ? "#ffca72" : "#ff7c4d"), true, 0.4));
    }
    Tick(_r, _now) {
        const a = _now / 1000;
        for (let e = 0; e < 4; e++) {
            const t = (0.8 * a + 0.23 * e) % 1;
            this.mFlames[e].Place(17 * Math.sin(2.4 * e + a), 39 * t - 3, 0, 1, 1 - t);
        }
    }
}
export class CEffectStatusPar extends CEffectSubject {
    mBolts = [];
    mOn = false;
    Build() {
        for (const e of [-1, 1]) {
            const pts = [[19 * e, -36, 26 * e, -27], [26 * e, -27, 18 * e, -18], [18 * e, -18, 27 * e, -8]];
            for (const p of pts)
                this.mBolts.push({ line: CEffectPiece.Line(this, H("#ffe968"), false, true, 14), p });
        }
        this.Show(true);
    }
    Show(_on) {
        this.mOn = _on;
        for (const b of this.mBolts)
            b.line.Place(b.p[0], b.p[1], b.p[2], b.p[3], 1.6, _on ? 1 : 0);
    }
    Tick(_r, _now) {
        const on = Math.floor(7 * _now / 1000) % 5 < 3;
        if (on != this.mOn)
            this.Show(on);
    }
}
export class CEffectStatusPsn extends CEffectSubject {
    mBubbles = [];
    mRings = [];
    Build() {
        for (let i = 0; i < 4; i++) {
            this.mBubbles.push(CEffectPiece.Sprite(this, "dot", 1, H("#b982d6"), false, 0.4));
            this.mRings.push(CEffectPiece.Sprite(this, "bubble", 1, H("#e4b3f7"), false, 0.41));
        }
    }
    Tick(_r, _now) {
        const a = _now / 1000;
        for (let e = 0; e < 4; e++) {
            const t = (0.55 * a + 0.24 * e) % 1;
            const x = 22 * Math.sin(2.1 * e + 0.5 * a), y = 6 - 42 * t, r = 2 + 3 * t, al = 0.7 * (1 - t);
            this.mBubbles[e].Place(x, -y, 0, r, al * 0.8);
            this.mRings[e].Place(x, -y, 0, r, al);
        }
    }
}
export class CEffectStatusSlp extends CEffectSubject {
    mZs = [];
    Build() {
        this.mZs.push(CEffectPiece.Sprite(this, "zglyph", 1, null, false, 0.4));
        this.mZs.push(CEffectPiece.Sprite(this, "zglyph", 0.7, null, false, 0.4));
    }
    Tick(_r, _now) {
        const a = _now / 1000;
        this.mZs[0].Place(13, -(-32 - (9 * a) % 13), 0, 1, 0.7);
        this.mZs[1].Place(21, -(-43 - (6 * a) % 9), 0, 1, 0.7);
    }
}
CEffectMgr.Register("status", (_o) => {
    const s = _o.state ?? "brn";
    if (s == "frz")
        return new CEffectStatusFrz();
    if (s == "par")
        return new CEffectStatusPar();
    if (s == "psn" || s == "tox")
        return new CEffectStatusPsn();
    if (s == "slp")
        return new CEffectStatusSlp();
    return new CEffectStatusBrn();
}, 60);
