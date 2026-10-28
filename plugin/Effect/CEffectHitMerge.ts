import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CParticle, CParticlePaint } from "../../artgine/app/subject/CParticle.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { FLAME_PALETTES } from "./CEffectCine.js";
import { HIT_STYLES, IHitStyle } from "./CEffectHit.js";
import { clamp, easeOut, QuantAlpha, rnd } from "./CEffectMath.js";
import { CEffectMgr, IEffectOption } from "./CEffectMgr.js";
import { CEffectPrim } from "./CEffectPrim.js";
import { CEffectShape } from "./CEffectShape.js";
import { CEffectSubject } from "./CEffectSubject.js";

interface IPiece { h: CParticlePaint, bw: number, bh: number, z: number }
interface IHit
{
    x: number, y: number, z: number, s: number, t: number, life: number,
    flash: IPiece, drops: IPiece[], fill: IPiece[], hot: IPiece[], halo: IPiece[]
}

const HALO_SCALE = 4.5;
const HALO_ALPHA = 0.45;

// 피격 효과의 머지 버전. 타입마다 발생기 하나를 계속 살려 두고, 피격이 날 때마다 그 머지에 슬롯만 붙였다 뗀다.
// CEffectTypeHit 과 같은 타이밍·배치지만 조각마다 서브젝트를 만들지 않고, 불꽃 후광은 글로우 한 장으로 근사한다.
// ring/crackle/bubbles 가 있는 타입은 지원하지 않아서 기존 typeHit 으로 넘긴다
export class CEffectHitMergeEmitter extends CParticle
{
    private mStyle: IHitStyle;
    private mHits = new Array<IHit>();
    private mFlashSmp: CPaint2D = null;
    private mDropSmp: CPaint2D = null;
    private mFillSmp = new Array<CPaint2D>();
    private mHotSmp = new Array<CPaint2D>();
    private mHaloSmp: CPaint2D = null;

    constructor(_style: IHitStyle)
    {
        super();
        this.mStyle = _style;
        const st = _style, pal = FLAME_PALETTES.fire;
        if (st.flash) this.mFlashSmp = CEffectPrim.Glow(1, 1, st.flash);
        if (st.drops) this.mDropSmp = CEffectShape.Paint(st.dropKey, 1, st.dropColor, st.dropAdd);
        if (st.flames)
        {
            for (let k = 0; k < 3; k++)
            {
                this.mFillSmp.push(CEffectShape.Paint("blob" + k, 1, pal.cold, false));
                this.mHotSmp.push(CEffectShape.Paint("blob" + k, 1, pal.hi, true));
            }
            this.mHaloSmp = CEffectPrim.Glow(1, 1, pal.glow);
        }
    }

    Alive() { return this.mHits.length; }

    private Take(_smp: CPaint2D, _z: number): IPiece
    {
        const h = this.Emit(_smp);
        if (h == null) return null;
        return { h, bw: h.mMat.mF32A[0], bh: h.mMat.mF32A[5], z: _z };
    }

    Spawn(_x: number, _y: number, _o: IEffectOption)
    {
        const st = this.mStyle, k = _o.small ? 0.5 : 1, n = (v: number) => v ? Math.max(1, Math.round(v * k)) : 0;
        const hit: IHit = {
            x: _x, y: _y, z: _o.z ?? 0.3, s: _o.scale ?? 1, t: 0, life: _o.life ?? st.life * (_o.small ? 0.7 : 1),
            flash: null, drops: [], fill: [], hot: [], halo: []
        };
        const nf = n(st.flames);
        for (let i = 0; i < nf; i++)
        {
            hit.halo.push(this.Take(this.mHaloSmp, 0.0078 + i * 0.0004));
            hit.fill.push(this.Take(this.mFillSmp[i % 3], 0.01 + i * 0.0004));
            hit.hot.push(this.Take(this.mHotSmp[(i + 1) % 3], 0.012 + i * 0.0004));
        }
        if (this.mFlashSmp) hit.flash = this.Take(this.mFlashSmp, 0.01);
        for (let i = 0; i < n(st.drops); i++) hit.drops.push(this.Take(this.mDropSmp, 0.02));
        this.mHits.push(hit);
        this.Tick(hit, 0);
    }

    private Put(_hit: IHit, _p: IPiece, _lx: number, _ly: number, _rot: number, _sc: number, _alpha: number)
    {
        if (_p == null) return;
        const f = _p.h.mMat.mF32A, S = _hit.s, c = Math.cos(_rot), s = Math.sin(_rot), sx = _p.bw * _sc * S, sy = _p.bh * _sc * S;
        f[0] = c * sx; f[1] = s * sx;
        f[4] = -s * sy; f[5] = c * sy;
        f[12] = _hit.x + _lx * S; f[13] = _hit.y + _ly * S; f[14] = _hit.z + _p.z;
        _p.h.SetMat(_p.h.mMat);
        _p.h.SetAlpha(QuantAlpha(_alpha, 20));
    }

    private Tick(_hit: IHit, _now: number)
    {
        const st = this.mStyle, r = _hit.t / _hit.life, t = _hit.t, early = clamp(1 - r * 2.2, 0, 1);
        if (_hit.flash) this.Put(_hit, _hit.flash, 0, 0, 0, st.flashSize * (0.6 + 0.8 * easeOut(Math.min(1, r * 3))), Math.max(0.01, 0.9 * early));
        for (let i = 0; i < _hit.drops.length; i++)
        {
            const ang = st.dropUp ? Math.PI * (0.12 + 0.76 * rnd(i, 1)) : rnd(i, 1) * Math.PI * 2, v = st.dropSpeed * (0.5 + rnd(i, 2));
            this.Put(_hit, _hit.drops[i], Math.cos(ang) * v * t, Math.sin(ang) * v * t - 0.5 * st.dropGravity * t * t, rnd(i, 3) * 6.28 + t * 4, st.dropSize * (0.8 + rnd(i, 4) * 0.6), 1 - r);
        }
        for (let i = 0; i < _hit.fill.length; i++)
        {
            const flick = 0.65 + 0.35 * Math.sin(_now * 0.02 + i * 2.1), size = (8 + 6 * rnd(i, 5)) * flick * (1 - 0.5 * r);
            const x = (rnd(i, 6) - 0.5) * 34, y = (rnd(i, 7) - 0.5) * 10 + size * 0.5 + 10 * r, a = Math.min(1, r * 8) * clamp((1 - r) / 0.35, 0, 1);
            this.Put(_hit, _hit.halo[i], x, y, 0, size * HALO_SCALE, Math.max(0.01, a * HALO_ALPHA));
            this.Put(_hit, _hit.fill[i], x, y, rnd(i, 8) * 6.28, size, a);
            this.Put(_hit, _hit.hot[i], x - size * 0.1, y - size * 0.15, rnd(i, 9) * 6.28, size * 0.55, a * flick);
        }
    }

    private Release(_hit: IHit)
    {
        const all = [_hit.flash, ..._hit.drops, ..._hit.fill, ..._hit.hot, ..._hit.halo];
        for (const p of all) if (p != null) p.h.Remove();
    }

    override Update(_update: CUpdate)
    {
        const dt = _update.DeltaTime() * CEffectSubject.sTimeScale, now = performance.now();
        for (let i = this.mHits.length - 1; i >= 0; --i)
        {
            const hit = this.mHits[i];
            hit.t += dt;
            if (hit.t >= hit.life)
            {
                this.Release(hit);
                this.mHits[i] = this.mHits[this.mHits.length - 1];
                this.mHits.pop();
                continue;
            }
            this.Tick(hit, now);
        }
    }
}

const sEmitter = new Map<string, CEffectHitMergeEmitter>();

export class CEffectHitMerge
{
    static IsSupported(_type: string)
    {
        const st = HIT_STYLES[String(_type ?? "").toLowerCase()];
        return st != null && !st.ring && !st.crackle && !st.bubbles && (st.flash != null || st.drops > 0 || st.flames > 0);
    }

    static Play(_type: string, _x: number, _y: number, _o: IEffectOption = {}): CSubject
    {
        const key = String(_type ?? "").toLowerCase();
        if (!CEffectHitMerge.IsSupported(key)) return CEffectMgr.Play("typeHit", _x, _y, { ..._o, type: key });
        let em = sEmitter.get(key);
        if (em == null || em.IsDestroy())
        {
            em = new CEffectHitMergeEmitter(HIT_STYLES[key]);
            CEffectMgr.sCanvas.PushSub(em);
            sEmitter.set(key, em);
        }
        em.Spawn(_x, _y, _o);
        return null;
    }
}
