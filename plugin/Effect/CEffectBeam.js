import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { TakeSeg } from "./CEffectCine.js";
import { Mix, WHITE, rnd } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectPiece, SetGlow } from "./CEffectPiece.js";
import { CEffectSustain, PickStyle } from "./CEffectSubject.js";
export class CBeamPath {
    mH = [];
    Push(_now, _a) {
        const h = this.mH;
        if (h.length) {
            let d = _a - h[h.length - 1].a;
            while (d > Math.PI)
                d -= 2 * Math.PI;
            while (d < -Math.PI)
                d += 2 * Math.PI;
            _a = h[h.length - 1].a + d;
        }
        if (!h.length || _now - h[h.length - 1].t > 8)
            h.push({ t: _now, a: _a });
        else
            h[h.length - 1].a = _a;
        while (h.length > 2 && h[1].t < _now - 800)
            h.shift();
    }
    At(_t) {
        const h = this.mH;
        if (_t <= h[0].t)
            return h[0].a;
        for (let i = h.length - 1; i > 0; i--)
            if (h[i - 1].t <= _t)
                return h[i - 1].a + (h[i].a - h[i - 1].a) * clamp((_t - h[i - 1].t) / Math.max(1, h[i].t - h[i - 1].t), 0, 1);
        return h[h.length - 1].a;
    }
    Lateral(_now, _lagMs, _reach, _n, _out) {
        const aNow = this.At(_now), step = _reach / _n;
        let acc = 0;
        _out[0] = 0;
        for (let i = 1; i <= _n; i++) {
            acc += Math.sin(this.At(_now - _lagMs * (1 - (i - 0.5) / _n)) - aNow) * step;
            _out[i] = acc;
        }
        const end = _out[_n];
        for (let i = 0; i <= _n; i++)
            _out[i] = -(_out[i] - end * i / _n);
    }
}
const BEAM_LAYERS = [{ kind: 7, f: 1 }, { kind: 8, f: 0.68 }, { kind: 9, f: 0.46 }, { kind: 10, f: 0.26 }];
function SegEnd(_ds, _ys, _s, _w) {
    const dx = _ds[_s + 1] - _ds[_s], dy = _ys[_s + 1] - _ys[_s], l = Math.hypot(dx, dy) || 1;
    let turn = 0;
    if (_s + 2 < _ds.length)
        turn = Math.abs(Math.atan2(_ys[_s + 2] - _ys[_s + 1], _ds[_s + 2] - _ds[_s + 1]) - Math.atan2(dy, dx));
    const e = 1.2 + 0.5 * _w * Math.min(turn, 1);
    return [_ds[_s + 1] + dx / l * e, _ys[_s + 1] + dy / l * e];
}
function BeamLat(_d, _len, _w, _amp0, _amp1, _freq, _now, _bend) {
    const u = clamp(_d / Math.max(1, _len), 0, 1), amp = _w * (_amp0 + _amp1 * u) * Math.min(1, _d / 50);
    const wave = amp * (Math.sin((_d * 0.032 - _now * 0.013) * _freq) + 0.35 * Math.sin((_d * 0.075 - _now * 0.021) * _freq + 1.3));
    const f = u * (_bend.length - 1), i = Math.min(_bend.length - 2, Math.floor(f));
    return wave + (_bend.length > 1 ? _bend[i] + (_bend[i + 1] - _bend[i]) * (f - i) : 0);
}
const GENERIC = (_c) => [Mix(_c, [0, 0, 0], 0.45), _c, Mix(_c, WHITE, 0.65), WHITE];
const BASE = {
    cols: GENERIC, width: 41, amp: [0.04, 0.14], freq: 1, lag: 140, flick: 0, coils: 0, specks: 0, streaks: 6, sparks: 14,
    muzzle: "puff", head: "ring", headColor: [1, 0.93, 0.6], glow: 1.4, ring: [1, 0.72, 0.25],
};
const BEAM_OPTION_KEYS = ["amp", "freq", "lag", "flick", "coils", "specks", "streaks", "sparks", "muzzle", "head", "headColor", "glow", "ring"];
export const BEAM_STYLES = {
    water: {
        ...BASE,
        cols: (c) => c[2] > c[0] + 0.3
            ? [[c[0] * 0.25, c[1] * 0.45, Math.min(1, c[2] * 0.95)], [Math.min(1, c[0] + 0.1), Math.min(1, c[1] + 0.2), 1], Mix(c, WHITE, 0.7), WHITE]
            : GENERIC(c),
    },
    psy: {
        ...BASE, cols: (c) => [Mix(c, [0.5, 0, 0.55], 0.45), c, Mix(c, WHITE, 0.62), WHITE], width: 44, amp: [0.03, 0.07], lag: 220, flick: 0.05,
        coils: 9, specks: 12, streaks: 0, sparks: 0, muzzle: "orb", head: "star", headColor: [1, 0.6, 0.9], glow: 2.6,
    },
    ice: { ...BASE, cols: () => [[0.1, 0.32, 0.65], [0.4, 0.82, 1], [0.85, 0.97, 1], WHITE], width: 36, amp: [0.02, 0.06], lag: 120, specks: 0, sparks: 18, head: "star", headColor: [0.7, 0.92, 1], glow: 1.6 },
    solar: { ...BASE, cols: () => [[0.05, 0.4, 0.1], [0.3, 0.85, 0.25], [0.85, 1, 0.65], WHITE], width: 46, amp: [0.05, 0.1], lag: 160, streaks: 4, sparks: 12, head: "star", headColor: [0.9, 1, 0.5], glow: 1.8 },
    dark: { ...BASE, cols: () => [[0.12, 0.03, 0.25], [0.45, 0.2, 0.8], [0.8, 0.65, 1], [1, 0.95, 1]], width: 44, amp: [0.05, 0.1], lag: 200, flick: 0.04, specks: 10, streaks: 0, sparks: 0, muzzle: "orb", head: "star", headColor: [0.7, 0.4, 1], glow: 1.6 },
};
export class CEffectBeam extends CEffectSustain {
    static kSeg = 36;
    static kGlow = 6;
    mPreset;
    mStyle = BEAM_STYLES.water;
    mLayers = [];
    mStreak = [];
    mGlowLn = [];
    mCoilB = [];
    mCoilF = [];
    mSpecks = [];
    mSpark = [];
    mHeadBlue = null;
    mHeadWhite = null;
    mHeadStar = null;
    mPuff = null;
    mMuzzleGlow = null;
    mOrb = null;
    mRing = null;
    mW = 50;
    mCoils = 0;
    mPath = new CBeamPath();
    mBend = [];
    constructor(_preset = "water") {
        super();
        this.mPreset = _preset;
    }
    Build(_o) {
        const st = this.mStyle = PickStyle(BEAM_STYLES, _o.preset ?? this.mPreset, "water", _o, BEAM_OPTION_KEYS);
        this.BeginSustain(_o, 320);
        this.mW = _o.width != null ? Math.max(_o.width * 0.9, 14 * (_o.bw ?? 1)) : st.width * (_o.bw ?? 1);
        const cols = _o.cols ?? st.cols(this.mColor);
        BEAM_LAYERS.forEach((L, i) => this.mLayers.push(Array.from({ length: CEffectBeam.kSeg }, () => TakeSeg(this, L.kind, cols[i]))));
        for (let i = 0; i < st.streaks; i++)
            this.mStreak.push(TakeSeg(this, 11, Mix(cols[1], WHITE, 0.85)));
        for (let g = 0; g < CEffectBeam.kGlow; g++)
            this.mGlowLn.push(CEffectPiece.Line(this, cols[1], true, cols[1], 120));
        this.mCoils = st.coils;
        for (let i = 0; i < st.coils; i++) {
            this.mCoilB.push(CEffectPiece.Sprite(this, "coilB_o", 1, [0.62, 0.42, 0.74], false, 0.001, null, null));
            this.mCoilF.push(CEffectPiece.Sprite(this, "coilF_o", 1, [0.97, 0.93, 1], false, 0.13, null, null));
        }
        for (let i = 0; i < st.specks; i++)
            this.mSpecks.push(CEffectPiece.Sprite(this, "dot", 1, cols[0].map(v => v * 0.35), false, 0.08, null, null));
        for (let i = 0; i < st.sparks; i++)
            this.mSpark.push(CEffectPiece.Sprite(this, "dot", 1, WHITE, true, 0.12, null, null));
        if (st.muzzle == "orb") {
            this.mMuzzleGlow = this.AddGlow(80, 80, [1, 0.96, 1]);
            this.mOrb = CEffectPiece.Disc(this, false, [1, 0.97, 1], false, st.headColor, 1.5, 0.12);
        }
        else {
            this.mPuff = this.AddGlow(34, 34, [0.85, 0.96, 1]);
        }
        if (st.head == "ring") {
            this.mHeadBlue = this.AddGlow(80, 80, st.headColor);
            this.mHeadWhite = this.AddGlow(36, 36, WHITE);
            this.mRing = CEffectPiece.Ring(this, st.ring, true, st.ring);
            this.mRing.SetPos(new CVec3(0, 0, 0.11));
        }
        else if (st.head == "star") {
            this.mHeadBlue = this.AddGlow(70, 70, st.headColor);
            this.mHeadStar = CEffectPiece.Sprite(this, "burst12", 1, WHITE, true, 0.14, null, null);
        }
        this.mPath.Push(performance.now(), this.GetRot().z);
    }
    Tick(_r, _now) {
        const S = CEffectBeam.kSeg, W = this.mW, st = this.mStyle;
        if (!this.Advance(_r, _now, 220))
            return;
        const a = this.mA, head = this.mHead, tail = this.mTail, hv = this.mHv;
        const on = head > tail + 2, clock2 = this.Clock(_now), flick = 1 + st.flick * Math.sin(_now * 0.05);
        this.mPath.Push(_now, this.GetRot().z);
        this.mPath.Lateral(_now, st.lag, this.mLen, S, this.mBend);
        const Y = (_d) => BeamLat(_d, this.mLen, W, st.amp[0], st.amp[1], st.freq, _now, this.mBend);
        const ds = [], ys = [];
        for (let i = 0; i <= S; i++) {
            const d = tail + (head - tail) * i / S;
            ds.push(d);
            ys.push(Y(d));
        }
        for (let l = 0; l < BEAM_LAYERS.length; l++)
            for (let s = 0; s < S; s++) {
                const w = W * BEAM_LAYERS[l].f * (0.72 + 0.28 * Math.min(1, ds[s] / 50)) * flick;
                const e = SegEnd(ds, ys, s, w);
                this.mLayers[l][s].Place(ds[s], ys[s], e[0], e[1], w, on ? a : 0);
            }
        for (let i = 0; i < this.mStreak.length; i++) {
            const ph = (_now * 0.0011 * (0.8 + 0.5 * rnd(1, i)) + i / this.mStreak.length) % 1, d0 = tail + (head - tail) * ph, d1 = Math.min(head, d0 + 34);
            const off = (rnd(2, i) - 0.5) * W * 0.5;
            this.mStreak[i].Place(d0, Y(d0) + off, d1, Y(d1) + off, 2.4, on && d1 > d0 + 2 ? a * 0.85 * Math.sin(ph * Math.PI) : 0);
        }
        for (let g = 0; g < CEffectBeam.kGlow; g++) {
            const i0 = Math.floor(g * S / CEffectBeam.kGlow), i1 = Math.floor((g + 1) * S / CEffectBeam.kGlow);
            this.mGlowLn[g].PlaceGlow(ds[i0], ys[i0], ds[i1], ys[i1], W * (st.coils ? 1.6 : 0.9), on ? st.glow * a : 0);
        }
        for (let i = 0; i < this.mCoils; i++) {
            const ph = (i / this.mCoils + clock2 * 0.28) % 1, d = tail + ph * (head - tail), y = Y(d), slope = Math.atan2(-(Y(d + 6) - Y(d - 6)), 12);
            const sc = W * 0.7 * (0.6 + 0.4 * Math.min(1, d / 60)) * flick / 58, al = on ? a * Math.min(1, d / 30) * (ph > 0.9 ? (1 - ph) * 10 : 1) : 0;
            this.mCoilB[i].Place(d, -y, slope, sc, al * 0.8);
            this.mCoilF[i].Place(d, -y, slope, sc, al);
        }
        for (let i = 0; i < this.mSpecks.length; i++) {
            const ph = (rnd(5, i) + clock2 * (0.35 + 0.3 * rnd(6, i))) % 1, d = tail + ph * (head - tail);
            this.mSpecks[i].Place(d, -(Y(d) + (rnd(7, i) - 0.5) * W * 0.4), 0, 1.2 + 1.6 * rnd(8, i), on ? a * 0.9 : 0);
        }
        for (let i = 0; i < this.mSpark.length; i++) {
            const ph = (_now * 0.0011 * (0.7 + rnd(1, i) * 0.7) + rnd(2, i)) % 1;
            const d = tail + (head - tail) * ph, f = (rnd(3, i) - 0.5) * 2;
            this.mSpark[i].Place(d, -(Y(d) + f * W * 0.5), 0, 0.6 + rnd(4, i) * 1.2, on ? a * (1 - ph * 0.4) : 0);
        }
        const pulse = 1 + 0.12 * Math.sin(_now * 0.03), yh = ys[S];
        if (this.mOrb) {
            this.mOrb.Place(tail + 8, ys[0], 13 * flick, 13 * flick, 0, a);
            SetGlow(this.mMuzzleGlow, tail + 6, -ys[0], 0.1, a);
        }
        else {
            SetGlow(this.mPuff, tail + 2, -ys[0], 0.1, 0.9 * a * (0.7 + 0.3 * Math.sin(_now * 0.04)));
        }
        if (st.head == "ring") {
            SetGlow(this.mHeadBlue, head, -yh, 0.08, 0.9 * a * hv, 96 * pulse);
            SetGlow(this.mHeadWhite, head, -yh, 0.09, a * hv, 52 * pulse);
            this.mRing.Place(head, yh, 22 * pulse, 18 * pulse, 0.9 * a * hv, 2);
        }
        else if (st.head == "star") {
            SetGlow(this.mHeadBlue, head, -yh, 0.09, a * hv);
            this.mHeadStar.Place(head, -yh, _now * 0.002, 0.5 * flick, a * hv);
        }
    }
}
CEffectMgr.Register("beam", () => new CEffectBeam("water"), 0.9);
CEffectMgr.Register("hydro", () => new CEffectBeam("water"), 0.9);
CEffectMgr.Register("bandBeam", () => new CEffectBeam("psy"), 1);
CEffectMgr.Register("iceBeam", () => new CEffectBeam("ice"), 0.9);
CEffectMgr.Register("solarBeam", () => new CEffectBeam("solar"), 0.9);
CEffectMgr.Register("darkBeam", () => new CEffectBeam("dark"), 0.9);
