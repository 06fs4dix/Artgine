import { TakeSeg } from "./CEffectCine.js";
import { JaggedPath, Mix, rnd, WHITE } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { CEffectPiece, SetGlow } from "./CEffectPiece.js";
import { CEffectSustain } from "./CEffectSubject.js";
const YELLOW = [1, 0.72, 0.04];
const STRIDE = 6;
export function GrowBranch(_segs, _x, _y, _ang, _len, _level, _step, _seed) {
    const n = _level == 1 ? 4 : 2, w0 = _level == 1 ? 2.2 : 1.3;
    let x = _x, y = _y, ang = _ang;
    for (let j = 0; j < n; j++) {
        const s = _seed + j * 7;
        ang += (rnd(_step, s) - 0.5) * 0.9;
        const L = _len / n * (0.6 + 0.8 * rnd(_step, s + 1)), nx = x + Math.cos(ang) * L, ny = y + Math.sin(ang) * L;
        _segs.push(x, y, nx, ny, w0 * (1 - 0.14 * j), (_level == 1 ? 0.9 : 0.7) * (1 - 0.15 * j));
        if (_level == 1 && j >= 1 && rnd(_step, s + 2) < 0.75)
            GrowBranch(_segs, nx, ny, ang + (rnd(_step, s + 3) > 0.5 ? 1 : -1) * (0.5 + 0.6 * rnd(_step, s + 4)), _len * 0.55, 2, _step, _seed + 50 + j * 13);
        x = nx;
        y = ny;
    }
}
export function GrowBurst(_segs, _cx, _cy, _n, _len, _step) {
    for (let i = 0; i < _n; i++)
        if (rnd(_step, 80 + i) > 0.15)
            GrowBranch(_segs, _cx, _cy, (i + rnd(_step, 40 + i) * 0.7) * Math.PI * 2 / _n, _len * (0.7 + 0.5 * rnd(_step, 60 + i)), 1, _step, 100 + i * 31);
}
export class CBoltLines {
    mOuter = [];
    mCore = [];
    constructor(_parent, _cap, _outer, _core) {
        for (let i = 0; i < _cap; i++)
            this.mOuter.push(TakeSeg(_parent, 12, _outer));
        for (let i = 0; i < _cap; i++)
            this.mCore.push(TakeSeg(_parent, 13, _core));
    }
    Draw(_segs, _a) {
        const n = Math.min(_segs.length / STRIDE, this.mOuter.length);
        for (let i = 0; i < this.mOuter.length; i++) {
            const k = i * STRIDE, on = i < n;
            this.mOuter[i].Place(on ? _segs[k] : 0, on ? _segs[k + 1] : 0, on ? _segs[k + 2] : 1, on ? _segs[k + 3] : 0, on ? _segs[k + 4] : 1, on ? _a * _segs[k + 5] : 0);
            this.mCore[i].Place(on ? _segs[k] : 0, on ? _segs[k + 1] : 0, on ? _segs[k + 2] : 1, on ? _segs[k + 3] : 0, on ? Math.max(0.8, _segs[k + 4] * 0.45) : 1, on ? _a * _segs[k + 5] : 0);
        }
    }
}
export class CEffectLightning extends CEffectSustain {
    static kN = 14;
    mGlowLn = [];
    mGhost = [];
    mBolt;
    mBurst;
    mNodes = [];
    mSrc;
    mHeadGlow;
    mSun;
    mAmp = 30;
    mPts = [];
    mOld = [];
    mSegs = [];
    mBurstSegs = [];
    Build(_o) {
        this.BeginSustain(_o, 320);
        this.mAmp = _o.width ?? 30;
        const c = _o.color ?? YELLOW, pale = Mix(c, WHITE, 0.55), N = CEffectLightning.kN;
        for (let i = 0; i < N; i++)
            this.mGlowLn.push(CEffectPiece.Line(this, c, true, c, 70));
        for (let i = 0; i < N; i++)
            this.mGhost.push(TakeSeg(this, 11, c));
        this.mBolt = new CBoltLines(this, 110, c, pale);
        this.mBurst = new CBoltLines(this, 60, c, pale);
        for (let i = 0; i < 4; i++)
            this.mNodes.push(this.AddGlow(70, 70, c));
        this.mSrc = this.AddGlow(44, 44, [1, 1, 0.92]);
        this.mHeadGlow = this.AddGlow(110, 110, [1, 1, 0.9]);
        this.mSun = CEffectPiece.Sprite(this, "burst12", 1, c, true, 0.14, null, c);
    }
    Tick(_r, _now) {
        if (!this.Advance(_r, _now, 180))
            return;
        const N = CEffectLightning.kN, a = this.mA, head = this.mHead, tail = this.mTail, p = this.mPts, q = this.mOld, len = head - tail;
        const step = Math.floor(_now / 70), al = len > 2 ? a * (rnd(step, 1) > 0.12 ? 1 : 0.6) : 0, fresh = (_now % 70) / 70;
        JaggedPath(N, len, this.mAmp, step, p);
        JaggedPath(N, len, this.mAmp, step - 1, q);
        const segs = this.mSegs;
        segs.length = 0;
        for (let i = 0; i < N; i++) {
            const ax = tail + p[i * 2], ay = p[i * 2 + 1], bx = tail + p[i * 2 + 2], by = p[i * 2 + 3];
            segs.push(ax, ay, bx, by, 3.4, 1);
            this.mGlowLn[i].PlaceGlow(ax, ay, bx, by, 10, 0.4 * al);
            this.mGhost[i].Place(tail + q[i * 2], q[i * 2 + 1], tail + q[i * 2 + 2], q[i * 2 + 3], 5, 0.3 * al * (1 - fresh));
        }
        for (let k = 1; k < N; k++) {
            if (rnd(step, 300 + k) > 0.55)
                continue;
            const dx = p[k * 2 + 2] - p[k * 2 - 2], dy = p[k * 2 + 3] - p[k * 2 - 1], side = rnd(step, 320 + k) > 0.5 ? 1 : -1;
            GrowBranch(segs, tail + p[k * 2], p[k * 2 + 1], Math.atan2(dy, dx) + side * (0.45 + 0.8 * rnd(step, 340 + k)), 34 + 44 * rnd(step, 360 + k), 1, step, 400 + k * 41);
        }
        this.mBolt.Draw(segs, al);
        for (let i = 0; i < this.mNodes.length; i++) {
            const k = 2 + i * 3 + (step % 2);
            SetGlow(this.mNodes[i], tail + p[k * 2], -p[k * 2 + 1], 0.02, 0.45 * al);
        }
        SetGlow(this.mSrc, tail, 0, 0.1, 0.95 * a);
        this.mSun.Place(tail, 0, rnd(step, 3) * 0.5, 0.3 + 0.1 * rnd(step, 2), al);
        SetGlow(this.mHeadGlow, head, 0, 0.04, 0.9 * a * this.mHv);
        const burst = this.mBurstSegs;
        burst.length = 0;
        GrowBurst(burst, head, 0, 7, 46, step);
        this.mBurst.Draw(burst, al * this.mHv);
    }
}
CEffectMgr.Register("lightning", () => new CEffectLightning(), 0.5);
