import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CPool } from "../../artgine/basic/CPool.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CAlpha } from "../../artgine/render/CAlpha.js";
import { CColor } from "../../artgine/render/CColor.js";
import { clamp, QuantAlpha } from "./CEffectMath.js";
import { CEffectPrim, TRGB } from "./CEffectPrim.js";
import { CEffectShape, RING_STEPS } from "./CEffectShape.js";

export { clamp };

// 번짐(원본 shadowBlur)의 세기 배율. 이펙트를 쓰는 쪽이 바꿀 수 있다
export class CEffectGlow
{
    static sLine = 1.15;
    static sShape = 0.9;
    static sSprite = 1.3;
}

// 세터가 값을 복사하므로 매 프레임 새 객체를 만들지 않고 임시 객체를 재사용한다
const sAlpha = new CAlpha(1, 0.002);
const sColor = new CColor(1, 1, 1, CColor.eModel.RGBMul);
const sPos = new CVec3();
const sRot = new CVec3();
const sSca = new CVec3(1, 1, 1);
const sSize = new CVec2();

export function SetAlpha(_pt: CPaint2D, _a: number)
{
    sAlpha.mF32A[0] = _a;
    _pt.SetAlphaModel(sAlpha);
}

export function SetTint(_pt: CPaint2D, _c: TRGB)
{
    sColor.mF32A[0] = _c[0];
    sColor.mF32A[1] = _c[1];
    sColor.mF32A[2] = _c[2];
    _pt.SetColorModel(sColor);
}

export function SetSize(_pt: CPaint2D, _w: number, _h: number)
{
    sSize.mF32A[0] = _w;
    sSize.mF32A[1] = _h;
    _pt.SetSize(sSize);
}

// 글로우 한 개의 위치와 알파(0.01 미만이면 사라지는 문제를 피하려 최소값을 둔다), 크기는 선택
export function SetGlow(_pt: CPaint2D, _x: number, _y: number, _z: number, _a: number, _size?: number)
{
    SetPos(_pt, _x, _y, _z);
    if (_size != null) SetSize(_pt, _size, _size);
    SetAlpha(_pt, Math.max(0.01, _a));
}

// 컴포넌트의 SetPos 는 전달한 객체를 그대로 보관하므로, 자기 벡터를 제자리에서 고쳐 쓴다
export function SetPos(_pt: CPaint2D, _x: number, _y: number, _z = 0)
{
    const v = _pt.GetPos();
    if (v.mF32A[0] == _x && v.mF32A[1] == _y && v.mF32A[2] == _z) return;
    v.mF32A[0] = _x;
    v.mF32A[1] = _y;
    v.mF32A[2] = _z;
    _pt.SetPos(v);
}

function SubPos(_s: CSubject, _x: number, _y: number, _z: number)
{
    sPos.mF32A[0] = _x;
    sPos.mF32A[1] = _y;
    sPos.mF32A[2] = _z;
    _s.SetPos(sPos);
}

function SubRot(_s: CSubject, _r: number)
{
    sRot.mF32A[0] = 0;
    sRot.mF32A[1] = 0;
    sRot.mF32A[2] = _r;
    _s.SetRot(sRot);
}

const sReg = new Set<string>();

// 풀에서 조각을 꺼낸다. 처음 쓰는 키면 생산자를 먼저 등록한다
export function Take<T extends CSubject>(_key: string, _make: () => T): T
{
    if (!sReg.has(_key))
    {
        sReg.add(_key);
        CPool.On(_key, () => _make(), CPool.ePool.Product);
    }
    return CPool.Product<T>(_key);
}

// 선분. 좌표는 원본 캔버스 기준(y 아래가 +). 선 방향으로 가우시안 원판을 늘어놓아 번짐을 만든다
export class CEffectLine extends CSubject
{
    mRect: CPaint2D;
    mDiscs: CPaint2D[] = [];
    mHalo = false;
    mA = -1;

    constructor(_add: boolean, _discs: number)
    {
        super();
        this.mRect = CEffectPrim.Solid(2, 2, _add);
        this.PushComp(this.mRect);
        for (let i = 0; i < _discs; ++i)
        {
            const d = CEffectShape.PaintWH("egG", 1, 1, [1, 1, 1], true);
            SetAlpha(d, 0.005);
            this.PushComp(d);
            this.mDiscs.push(d);
        }
    }

    Config(_rgb: TRGB, _halo: TRGB)
    {
        SetTint(this.mRect, _rgb);
        this.mHalo = _halo != null;
        for (const d of this.mDiscs) { SetTint(d, _halo ?? [0, 0, 0]); SetAlpha(d, 0.005); }
        SubPos(this, 0, 0, 0);
        this.mA = -1;
    }

    Place(_ax: number, _ay: number, _bx: number, _by: number, _w: number, _a: number)
    {
        const dx = _bx - _ax, dy = -(_by - _ay), len = Math.hypot(dx, dy);
        SubPos(this, (_ax + _bx) / 2, -(_ay + _by) / 2, 0);
        SubRot(this, Math.atan2(dy, dx));
        SetSize(this.mRect, Math.max(1, len), Math.max(1, _w));
        const a = QuantAlpha(_a, 40);
        if (a != this.mA) { this.mA = a; SetAlpha(this.mRect, a); }
        if (!this.mHalo) return;
        const n = this.mDiscs.length - 1;
        const s = len / n, r = 21 + 0.15 * _w;
        const peak = Math.min(0.9, _w / 17.5) * CEffectGlow.sLine * a;
        const da = clamp(peak * s / 17.5, 0, 1);
        const sz = r * 2.133;
        for (let k = 0; k <= n; ++k)
        {
            const d = this.mDiscs[k];
            SetPos(d, len * (k / n - 0.5), 0, 0);
            SetSize(d, sz, sz);
            SetAlpha(d, Math.max(0.005, da * (k == 0 || k == n ? 0.5 : 1)));
        }
    }

    // 선 본체의 불투명도만 바꾼다(모양이 변하지 않는 선용)
    SetOpacity(_a: number)
    {
        const a = QuantAlpha(_a, 40);
        if (a == this.mA) return;
        this.mA = a;
        SetAlpha(this.mRect, a);
    }

    // 선 본체는 그리지 않고 번짐만 그린다(물줄기 같은 면 모양 위에 얹는 용도). 좌표는 캔버스 기준
    PlaceGlow(_ax: number, _ay: number, _bx: number, _by: number, _w: number, _peak: number)
    {
        const dx = _bx - _ax, dy = -(_by - _ay), len = Math.hypot(dx, dy);
        SubPos(this, (_ax + _bx) / 2, -(_ay + _by) / 2, 0);
        SubRot(this, Math.atan2(dy, dx));
        if (this.mA != 0) { this.mA = 0; SetAlpha(this.mRect, 0); }
        const n = this.mDiscs.length - 1;
        const s = len / n, r = 21 + 0.15 * _w;
        const da = clamp(_peak * s / 17.5, 0, 1);
        const sz = r * 2.133;
        for (let k = 0; k <= n; ++k)
        {
            const d = this.mDiscs[k];
            SetPos(d, len * (k / n - 0.5), 0, 0);
            SetSize(d, sz, sz);
            SetAlpha(d, Math.max(0.005, da * (k == 0 || k == n ? 0.5 : 1)));
        }
    }
}

// 타원 링. 두께 단계와 후광 크기 구간을 크기에 맞게 고른다
export class CEffectRing extends CSubject
{
    mPt: CPaint2D;
    mHalo: CPaint2D;
    mStep = -1;
    mHaloKey = "";
    mKh = 1;
    mA = -1;

    constructor(_add: boolean)
    {
        super();
        this.mHalo = CEffectShape.HaloPaint("ellring4", 1, [1, 1, 1], 1, _add);
        SetAlpha(this.mHalo, 0.01);
        this.PushComp(this.mHalo);
        this.mPt = CEffectShape.PaintWH("ellring4", 1, 1, [1, 1, 1], _add);
        this.PushComp(this.mPt);
    }

    Config(_rgb: TRGB, _halo: TRGB)
    {
        SetTint(this.mPt, _rgb);
        SetTint(this.mHalo, _halo ?? _rgb);
        this.mA = -1;
        this.mStep = -1;
        this.mHaloKey = "";
    }

    Place(_x: number, _y: number, _rx: number, _ry: number, _a: number, _lw = 2)
    {
        const t = _lw / Math.max(1, (_rx + _ry) / 2);
        const i = Math.max(0, Math.min(RING_STEPS - 1, Math.round(Math.log(0.8 / t) / Math.log(1.55))));
        const key = "ellring" + i;
        const b = CEffectShape.Bucket((_rx + _ry) / 2);
        if (i != this.mStep) { this.mStep = i; this.mPt.SetTexture(CEffectShape.Key(key)); }
        if (this.mHaloKey != key + "#" + b)
        {
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
        if (a != this.mA)
        {
            this.mA = a;
            SetAlpha(this.mPt, a);
            SetAlpha(this.mHalo, Math.max(0.005, a * CEffectGlow.sShape * 0.85));
        }
    }
}

// 도형 스프라이트(별, 주먹, 칼, 방패 등). 본체 + 선택적 외곽선 + 후광
export class CEffectSprite extends CSubject
{
    mPt: CPaint2D;
    mOut: CPaint2D = null;
    mHalo: CPaint2D = null;
    mShapeKey: string;
    mUnits: number;
    mAdd: boolean;
    mHaloAdd: boolean;
    mBucket = 1;
    mA = -1;

    constructor(_key: string, _units: number, _add: boolean, _out: boolean, _halo: boolean, _haloAdd = _add)
    {
        super();
        this.mShapeKey = _key;
        this.mUnits = _units;
        this.mAdd = _add;
        this.mHaloAdd = _haloAdd;
        if (_halo && CEffectShape.HasHalo(_key))
        {
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
        if (_out)
        {
            this.mOut = CEffectShape.Paint(_key + "_o", _units, null, _add);
            const oo = CEffectShape.Offset(_key + "_o", _units);
            SetPos(this.mOut, oo.x, oo.y, 0);
            SetAlpha(this.mOut, 0.01);
            this.PushComp(this.mOut);
        }
    }

    Config(_rgb: TRGB, _out: TRGB, _halo: TRGB)
    {
        if (_rgb) SetTint(this.mPt, _rgb);
        if (this.mOut && _out) SetTint(this.mOut, _out);
        if (this.mHalo && _halo) SetTint(this.mHalo, _halo);
        this.mA = -1;
        this.mBucket = -1;
    }

    Place(_x: number, _y: number, _rot: number, _scale = 1, _alpha = 1)
    {
        sPos.mF32A[0] = _x; sPos.mF32A[1] = _y; sPos.mF32A[2] = this.GetPos().z;
        this.SetPos(sPos);
        SubRot(this, _rot);
        sSca.mF32A[0] = _scale; sSca.mF32A[1] = _scale; sSca.mF32A[2] = 1;
        this.SetSca(sSca);
        if (this.mHalo)
        {
            const b = CEffectShape.Bucket(this.mUnits * _scale);
            if (b != this.mBucket)
            {
                this.mBucket = b;
                const sh = CEffectShape.Find(this.mShapeKey), pad = CEffectShape.HaloPad(this.mShapeKey, b), f = this.mUnits / CEffectShape.sScale.get(this.mShapeKey).scale;
                this.mHalo.SetTexture(CEffectShape.HaloKey(this.mShapeKey, b));
                SetSize(this.mHalo, (sh.w + pad * 2) * f, (sh.h + pad * 2) * f);
            }
        }
        const a = QuantAlpha(_alpha, 20);
        if (a != this.mA)
        {
            this.mA = a;
            SetAlpha(this.mPt, a);
            if (this.mOut) SetAlpha(this.mOut, Math.max(0.01, a));
            if (this.mHalo) SetAlpha(this.mHalo, Math.max(0.01, a * CEffectGlow.sSprite * (this.mHaloAdd ? 1 : 0.85)));
        }
    }
}

// 채워진 타원/링 도형(투사체용). 회전하며 크기가 바뀐다
export class CEffectDisc extends CSubject
{
    mPt: CPaint2D;
    mHalo: CPaint2D = null;
    mRing: boolean;
    mLw = 1.5;
    mK: number;
    mKh = 1;
    mStep = -1;
    mHaloKey = "";
    mAdd: boolean;
    mA = -1;

    constructor(_ring: boolean, _add: boolean, _halo: boolean)
    {
        super();
        this.mRing = _ring;
        this.mAdd = _add;
        const base = _ring ? "ellring4" : "ell";
        this.mK = _ring ? 128 / CEffectShape.sScale.get(base).scale : 128 / 60;
        if (_halo)
        {
            this.mHalo = CEffectShape.HaloPaint(base, 1, [1, 1, 1], 1, _add);
            SetAlpha(this.mHalo, 0.01);
            this.PushComp(this.mHalo);
        }
        this.mPt = CEffectShape.PaintWH(base, 1, 1, [1, 1, 1], _add);
        this.PushComp(this.mPt);
    }

    Config(_rgb: TRGB, _halo: TRGB, _lw: number)
    {
        SetTint(this.mPt, _rgb);
        if (this.mHalo && _halo) SetTint(this.mHalo, _halo);
        this.mLw = _lw;
        this.mA = -1;
        this.mStep = -1;
        this.mHaloKey = "";
    }

    Place(_x: number, _y: number, _rx: number, _ry: number, _rot: number, _a: number)
    {
        sPos.mF32A[0] = _x; sPos.mF32A[1] = -_y; sPos.mF32A[2] = this.GetPos().z;
        this.SetPos(sPos);
        SubRot(this, -_rot);
        if (this.mRing)
        {
            const t = this.mLw / Math.max(1, (_rx + _ry) / 2);
            const i = Math.max(0, Math.min(RING_STEPS - 1, Math.round(Math.log(0.8 / t) / Math.log(1.55))));
            if (i != this.mStep)
            {
                this.mStep = i;
                const key = "ellring" + i;
                this.mPt.SetTexture(CEffectShape.Key(key));
                this.mK = 128 / CEffectShape.sScale.get(key).scale;
            }
        }
        if (this.mHalo)
        {
            const key = this.mRing ? "ellring" + this.mStep : "ell", b = CEffectShape.Bucket((_rx + _ry) / 2);
            if (this.mHaloKey != key + "#" + b)
            {
                this.mHaloKey = key + "#" + b;
                this.mHalo.SetTexture(CEffectShape.HaloKey(key, b));
                this.mKh = (128 + 2 * CEffectShape.HaloPad(key, b)) / CEffectShape.sScale.get(key).scale;
            }
            SetSize(this.mHalo, Math.max(1, _rx * this.mKh), Math.max(1, _ry * this.mKh));
        }
        SetSize(this.mPt, Math.max(1, _rx * this.mK), Math.max(1, _ry * this.mK));
        const a = QuantAlpha(_a, 40);
        if (a != this.mA)
        {
            this.mA = a;
            SetAlpha(this.mPt, Math.max(0.005, a));
            if (this.mHalo) SetAlpha(this.mHalo, Math.max(0.005, a * CEffectGlow.sShape * (this.mAdd ? 1 : 0.85)));
        }
    }
}

// 조각을 풀에서 꺼내 부모에 붙인다. 부모가 파괴되면 조각은 자동으로 풀에 돌아간다
export class CEffectPiece
{
    static Line(_parent: CSubject, _rgb: TRGB, _add = false, _halo: TRGB | boolean = true, _maxLen = 20): CEffectLine
    {
        const discs = Math.max(2, Math.min(8, Math.ceil(_maxLen / 14) + 1));
        const halo = _halo === true ? _rgb : (_halo === false ? null : _halo);
        const line = Take("fxLine|" + _add + "|" + discs, () => new CEffectLine(_add, discs));
        line.Config(_rgb, halo);
        _parent.PushChild(line);
        return line;
    }

    static Ring(_parent: CSubject, _rgb: TRGB, _add = false, _halo: TRGB = null): CEffectRing
    {
        const ring = Take("fxRing|" + CEffectShape.Key("ellring4") + "|" + _add, () => new CEffectRing(_add));
        ring.Config(_rgb, _halo);
        _parent.PushChild(ring);
        return ring;
    }

    static Sprite(_parent: CSubject, _key: string, _units: number, _rgb: TRGB = null, _add = false, _z = 0, _out: TRGB = null, _halo: TRGB = null, _haloAdd = _add): CEffectSprite
    {
        const spr = Take("fxSpr|" + CEffectShape.Key(_key) + (_out != null ? CEffectShape.Key(_key + "_o") : "") + "|" + _units + "|" + _add + "|" + (_out != null) + "|" + (_halo != null) + "|" + _haloAdd, () => new CEffectSprite(_key, _units, _add, _out != null, _halo != null, _haloAdd));
        spr.Config(_rgb, _out, _halo);
        SubPos(spr, 0, 0, _z);
        _parent.PushChild(spr);
        return spr;
    }

    static Disc(_parent: CSubject, _ring: boolean, _rgb: TRGB, _add: boolean, _halo: TRGB = null, _lw = 1.5, _z = 0): CEffectDisc
    {
        const d = Take("fxDisc|" + CEffectShape.Key(_ring ? "ellring4" : "ell") + "|" + _ring + "|" + _add + "|" + (_halo != null), () => new CEffectDisc(_ring, _add, _halo != null));
        d.Config(_rgb, _halo, _lw);
        SubPos(d, 0, 0, _z);
        _parent.PushChild(d);
        return d;
    }
}
