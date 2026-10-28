import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CPool } from "../../artgine/basic/CPool.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CAlpha } from "../../artgine/render/CAlpha.js";
import { CColor } from "../../artgine/render/CColor.js";
import { clamp, QuantAlpha } from "./CEffectMath.js";
import { CEffectPrim } from "./CEffectPrim.js";
import { CEffectShape, RING_STEPS } from "./CEffectShape.js";
export { clamp };
export class CEffectGlow {
    static sLine = 1.15;
    static sShape = 0.9;
    static sSprite = 1.3;
}
const sAlpha = new CAlpha(1, 0.002);
const sColor = new CColor(1, 1, 1, CColor.eModel.RGBMul);
const sPos = new CVec3();
const sRot = new CVec3();
const sSca = new CVec3(1, 1, 1);
const sSize = new CVec2();
export function SetAlpha(_pt, _a) {
    sAlpha.mF32A[0] = _a;
    _pt.SetAlphaModel(sAlpha);
}
export function SetTint(_pt, _c) {
    sColor.mF32A[0] = _c[0];
    sColor.mF32A[1] = _c[1];
    sColor.mF32A[2] = _c[2];
    _pt.SetColorModel(sColor);
}
export function SetSize(_pt, _w, _h) {
    sSize.mF32A[0] = _w;
    sSize.mF32A[1] = _h;
    _pt.SetSize(sSize);
}
export function SetGlow(_pt, _x, _y, _z, _a, _size) {
    SetPos(_pt, _x, _y, _z);
    if (_size != null)
        SetSize(_pt, _size, _size);
    SetAlpha(_pt, Math.max(0.01, _a));
}
export function SetPos(_pt, _x, _y, _z = 0) {
    const v = _pt.GetPos();
    if (v.mF32A[0] == _x && v.mF32A[1] == _y && v.mF32A[2] == _z)
        return;
    v.mF32A[0] = _x;
    v.mF32A[1] = _y;
    v.mF32A[2] = _z;
    _pt.SetPos(v);
}
function SubPos(_s, _x, _y, _z) {
    sPos.mF32A[0] = _x;
    sPos.mF32A[1] = _y;
    sPos.mF32A[2] = _z;
    _s.SetPos(sPos);
}
function SubRot(_s, _r) {
    sRot.mF32A[0] = 0;
    sRot.mF32A[1] = 0;
    sRot.mF32A[2] = _r;
    _s.SetRot(sRot);
}
const sReg = new Set();
export function Take(_key, _make) {
    if (!sReg.has(_key)) {
        sReg.add(_key);
        CPool.On(_key, () => _make(), CPool.ePool.Product);
    }
    return CPool.Product(_key);
}
export class CEffectLine extends CSubject {
    mRect;
    mDiscs = [];
    mHalo = false;
    mA = -1;
    constructor(_add, _discs) {
        super();
        this.mRect = CEffectPrim.Solid(2, 2, _add);
        this.PushComp(this.mRect);
        for (let i = 0; i < _discs; ++i) {
            const d = CEffectShape.PaintWH("egG", 1, 1, [1, 1, 1], true);
            SetAlpha(d, 0.005);
            this.PushComp(d);
            this.mDiscs.push(d);
        }
    }
    Config(_rgb, _halo) {
        SetTint(this.mRect, _rgb);
        this.mHalo = _halo != null;
        for (const d of this.mDiscs) {
            SetTint(d, _halo ?? [0, 0, 0]);
            SetAlpha(d, 0.005);
        }
        SubPos(this, 0, 0, 0);
        this.mA = -1;
    }
    Place(_ax, _ay, _bx, _by, _w, _a) {
        const dx = _bx - _ax, dy = -(_by - _ay), len = Math.hypot(dx, dy);
        SubPos(this, (_ax + _bx) / 2, -(_ay + _by) / 2, 0);
        SubRot(this, Math.atan2(dy, dx));
        SetSize(this.mRect, Math.max(1, len), Math.max(1, _w));
        const a = QuantAlpha(_a, 40);
        if (a != this.mA) {
            this.mA = a;
            SetAlpha(this.mRect, a);
        }
        if (!this.mHalo)
            return;
        const n = this.mDiscs.length - 1;
        const s = len / n, r = 21 + 0.15 * _w;
        const peak = Math.min(0.9, _w / 17.5) * CEffectGlow.sLine * a;
        const da = clamp(peak * s / 17.5, 0, 1);
        const sz = r * 2.133;
        for (let k = 0; k <= n; ++k) {
            const d = this.mDiscs[k];
            SetPos(d, len * (k / n - 0.5), 0, 0);
            SetSize(d, sz, sz);
            SetAlpha(d, Math.max(0.005, da * (k == 0 || k == n ? 0.5 : 1)));
        }
    }
    SetOpacity(_a) {
        const a = QuantAlpha(_a, 40);
        if (a == this.mA)
            return;
        this.mA = a;
        SetAlpha(this.mRect, a);
    }
    PlaceGlow(_ax, _ay, _bx, _by, _w, _peak) {
        const dx = _bx - _ax, dy = -(_by - _ay), len = Math.hypot(dx, dy);
        SubPos(this, (_ax + _bx) / 2, -(_ay + _by) / 2, 0);
        SubRot(this, Math.atan2(dy, dx));
        if (this.mA != 0) {
            this.mA = 0;
            SetAlpha(this.mRect, 0);
        }
        const n = this.mDiscs.length - 1;
        const s = len / n, r = 21 + 0.15 * _w;
        const da = clamp(_peak * s / 17.5, 0, 1);
        const sz = r * 2.133;
        for (let k = 0; k <= n; ++k) {
            const d = this.mDiscs[k];
            SetPos(d, len * (k / n - 0.5), 0, 0);
            SetSize(d, sz, sz);
            SetAlpha(d, Math.max(0.005, da * (k == 0 || k == n ? 0.5 : 1)));
        }
    }
}
export class CEffectRing extends CSubject {
    mPt;
    mHalo;
    mStep = -1;
    mHaloKey = "";
    mKh = 1;
    mA = -1;
    constructor(_add) {
        super();
        this.mHalo = CEffectShape.HaloPaint("ellring4", 1, [1, 1, 1], 1, _add);
        SetAlpha(this.mHalo, 0.01);
        this.PushComp(this.mHalo);
        this.mPt = CEffectShape.PaintWH("ellring4", 1, 1, [1, 1, 1], _add);
        this.PushComp(this.mPt);
    }
    Config(_rgb, _halo) {
        SetTint(this.mPt, _rgb);
        SetTint(this.mHalo, _halo ?? _rgb);
        this.mA = -1;
        this.mStep = -1;
        this.mHaloKey = "";
    }
    Place(_x, _y, _rx, _ry, _a, _lw = 2) {
        const t = _lw / Math.max(1, (_rx + _ry) / 2);
        const i = Math.max(0, Math.min(RING_STEPS - 1, Math.round(Math.log(0.8 / t) / Math.log(1.55))));
        const key = "ellring" + i;
        const b = CEffectShape.Bucket((_rx + _ry) / 2);
        if (i != this.mStep) {
            this.mStep = i;
            this.mPt.SetTexture(CEffectShape.Key(key));
        }
        if (this.mHaloKey != key + "#" + b) {
            this.mHaloKey = key + "#" + b;
            this.mHalo.SetTexture(CEffectShape.HaloKey(key, b));
            this.mKh = (128 + 2 * CEffectShape.HaloPad(key, b)) / CEffectShape.sScale.get(key).scale;
        }
        const k = 128 / CEffectShape.sScale.get(key).scale;
        SetPos(this.mPt, _x, -_y);
        SetPos(this.mHalo, _x, -_y);
        SetSize(this.mPt, Math.max(1, _rx * k), Math.max(1, _ry * k));
        SetSize(this.mHalo, Math.max(1, _rx * this.mKh), Math.max(1, _ry * this.mKh));
        const a = QuantAlpha(_a, 40);
        if (a != this.mA) {
            this.mA = a;
            SetAlpha(this.mPt, a);
            SetAlpha(this.mHalo, Math.max(0.005, a * CEffectGlow.sShape * 0.85));
        }
    }
}
export class CEffectSprite extends CSubject {
    mPt;
    mOut = null;
    mHalo = null;
    mShapeKey;
    mUnits;
    mAdd;
    mHaloAdd;
    mBucket = 1;
    mA = -1;
    constructor(_key, _units, _add, _out, _halo, _haloAdd = _add) {
        super();
        this.mShapeKey = _key;
        this.mUnits = _units;
        this.mAdd = _add;
        this.mHaloAdd = _haloAdd;
        if (_halo && CEffectShape.HasHalo(_key)) {
            this.mHalo = CEffectShape.HaloPaint(_key, _units, [1, 1, 1], 1, _haloAdd);
            const hp = CEffectShape.Offset(_key, _units);
            SetPos(this.mHalo, hp.x, hp.y, -0.002);
            SetAlpha(this.mHalo, 0.01);
            this.PushComp(this.mHalo);
        }
        this.mPt = CEffectShape.Paint(_key, _units, null, _add);
        const o = CEffectShape.Offset(_key, _units);
        SetPos(this.mPt, o.x, o.y, 0);
        this.PushComp(this.mPt);
        if (_out) {
            this.mOut = CEffectShape.Paint(_key + "_o", _units, null, _add);
            const oo = CEffectShape.Offset(_key + "_o", _units);
            SetPos(this.mOut, oo.x, oo.y, 0);
            SetAlpha(this.mOut, 0.01);
            this.PushComp(this.mOut);
        }
    }
    Config(_rgb, _out, _halo) {
        if (_rgb)
            SetTint(this.mPt, _rgb);
        if (this.mOut && _out)
            SetTint(this.mOut, _out);
        if (this.mHalo && _halo)
            SetTint(this.mHalo, _halo);
        this.mA = -1;
        this.mBucket = -1;
    }
    Place(_x, _y, _rot, _scale = 1, _alpha = 1) {
        sPos.mF32A[0] = _x;
        sPos.mF32A[1] = _y;
        sPos.mF32A[2] = this.GetPos().z;
        this.SetPos(sPos);
        SubRot(this, _rot);
        sSca.mF32A[0] = _scale;
        sSca.mF32A[1] = _scale;
        sSca.mF32A[2] = 1;
        this.SetSca(sSca);
        if (this.mHalo) {
            const b = CEffectShape.Bucket(this.mUnits * _scale);
            if (b != this.mBucket) {
                this.mBucket = b;
                const sh = CEffectShape.Find(this.mShapeKey), pad = CEffectShape.HaloPad(this.mShapeKey, b), f = this.mUnits / CEffectShape.sScale.get(this.mShapeKey).scale;
                this.mHalo.SetTexture(CEffectShape.HaloKey(this.mShapeKey, b));
                SetSize(this.mHalo, (sh.w + pad * 2) * f, (sh.h + pad * 2) * f);
            }
        }
        const a = QuantAlpha(_alpha, 20);
        if (a != this.mA) {
            this.mA = a;
            SetAlpha(this.mPt, a);
            if (this.mOut)
                SetAlpha(this.mOut, Math.max(0.01, a));
            if (this.mHalo)
                SetAlpha(this.mHalo, Math.max(0.01, a * CEffectGlow.sSprite * (this.mHaloAdd ? 1 : 0.85)));
        }
    }
}
export class CEffectDisc extends CSubject {
    mPt;
    mHalo = null;
    mRing;
    mLw = 1.5;
    mK;
    mKh = 1;
    mStep = -1;
    mHaloKey = "";
    mAdd;
    mA = -1;
    constructor(_ring, _add, _halo) {
        super();
        this.mRing = _ring;
        this.mAdd = _add;
        const base = _ring ? "ellring4" : "ell";
        this.mK = _ring ? 128 / CEffectShape.sScale.get(base).scale : 128 / 60;
        if (_halo) {
            this.mHalo = CEffectShape.HaloPaint(base, 1, [1, 1, 1], 1, _add);
            SetAlpha(this.mHalo, 0.01);
            this.PushComp(this.mHalo);
        }
        this.mPt = CEffectShape.PaintWH(base, 1, 1, [1, 1, 1], _add);
        this.PushComp(this.mPt);
    }
    Config(_rgb, _halo, _lw) {
        SetTint(this.mPt, _rgb);
        if (this.mHalo && _halo)
            SetTint(this.mHalo, _halo);
        this.mLw = _lw;
        this.mA = -1;
        this.mStep = -1;
        this.mHaloKey = "";
    }
    Place(_x, _y, _rx, _ry, _rot, _a) {
        sPos.mF32A[0] = _x;
        sPos.mF32A[1] = -_y;
        sPos.mF32A[2] = this.GetPos().z;
        this.SetPos(sPos);
        SubRot(this, -_rot);
        if (this.mRing) {
            const t = this.mLw / Math.max(1, (_rx + _ry) / 2);
            const i = Math.max(0, Math.min(RING_STEPS - 1, Math.round(Math.log(0.8 / t) / Math.log(1.55))));
            if (i != this.mStep) {
                this.mStep = i;
                const key = "ellring" + i;
                this.mPt.SetTexture(CEffectShape.Key(key));
                this.mK = 128 / CEffectShape.sScale.get(key).scale;
            }
        }
        if (this.mHalo) {
            const key = this.mRing ? "ellring" + this.mStep : "ell", b = CEffectShape.Bucket((_rx + _ry) / 2);
            if (this.mHaloKey != key + "#" + b) {
                this.mHaloKey = key + "#" + b;
                this.mHalo.SetTexture(CEffectShape.HaloKey(key, b));
                this.mKh = (128 + 2 * CEffectShape.HaloPad(key, b)) / CEffectShape.sScale.get(key).scale;
            }
            SetSize(this.mHalo, Math.max(1, _rx * this.mKh), Math.max(1, _ry * this.mKh));
        }
        SetSize(this.mPt, Math.max(1, _rx * this.mK), Math.max(1, _ry * this.mK));
        const a = QuantAlpha(_a, 40);
        if (a != this.mA) {
            this.mA = a;
            SetAlpha(this.mPt, Math.max(0.005, a));
            if (this.mHalo)
                SetAlpha(this.mHalo, Math.max(0.005, a * CEffectGlow.sShape * (this.mAdd ? 1 : 0.85)));
        }
    }
}
export class CEffectPiece {
    static Line(_parent, _rgb, _add = false, _halo = true, _maxLen = 20) {
        const discs = Math.max(2, Math.min(8, Math.ceil(_maxLen / 14) + 1));
        const halo = _halo === true ? _rgb : (_halo === false ? null : _halo);
        const line = Take("fxLine|" + _add + "|" + discs, () => new CEffectLine(_add, discs));
        line.Config(_rgb, halo);
        _parent.PushChild(line);
        return line;
    }
    static Ring(_parent, _rgb, _add = false, _halo = null) {
        const ring = Take("fxRing|" + CEffectShape.Key("ellring4") + "|" + _add, () => new CEffectRing(_add));
        ring.Config(_rgb, _halo);
        _parent.PushChild(ring);
        return ring;
    }
    static Sprite(_parent, _key, _units, _rgb = null, _add = false, _z = 0, _out = null, _halo = null, _haloAdd = _add) {
        const spr = Take("fxSpr|" + CEffectShape.Key(_key) + (_out != null ? CEffectShape.Key(_key + "_o") : "") + "|" + _units + "|" + _add + "|" + (_out != null) + "|" + (_halo != null) + "|" + _haloAdd, () => new CEffectSprite(_key, _units, _add, _out != null, _halo != null, _haloAdd));
        spr.Config(_rgb, _out, _halo);
        SubPos(spr, 0, 0, _z);
        _parent.PushChild(spr);
        return spr;
    }
    static Disc(_parent, _ring, _rgb, _add, _halo = null, _lw = 1.5, _z = 0) {
        const d = Take("fxDisc|" + CEffectShape.Key(_ring ? "ellring4" : "ell") + "|" + _ring + "|" + _add + "|" + (_halo != null), () => new CEffectDisc(_ring, _add, _halo != null));
        d.Config(_rgb, _halo, _lw);
        SubPos(d, 0, 0, _z);
        _parent.PushChild(d);
        return d;
    }
}
