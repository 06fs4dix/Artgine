import { clamp, easeOut, Mix, rnd, WHITE } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { FLAME_PALETTES } from "./CEffectCine.js";
import { CBoltLines, GrowBurst } from "./CEffectLightning.js";
import { CEffectPiece, CEffectRing, CEffectSprite, SetGlow } from "./CEffectPiece.js";
import { TRGB } from "./CEffectPrim.js";
import { CEffectSubject, IEffectOption, PickStyle } from "./CEffectSubject.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";

// 타입별 피격 효과의 구성. 값이 0 이거나 null 이면 그 부분은 만들지 않는다
export interface IHitStyle
{
    life: number;
    flash: TRGB | null;      // 맞은 자리의 번쩍임
    flashSize: number;
    ring: TRGB | null;       // 퍼지는 물결 링
    ringSize: number;
    crackle: number;         // 사방으로 터지는 전기 균열 수
    drops: number;           // 튀는 알갱이 수(불씨, 물방울, 얼음 조각, 잎 등)
    dropKey: string;
    dropColor: TRGB;
    dropAdd: boolean;
    dropSpeed: number;
    dropGravity: number;     // 양수면 떨어지고 음수면 떠오른다
    dropSize: number;
    dropUp: boolean;         // true 면 위쪽으로만 튄다
    flames: number;          // 맞은 뒤에도 잠깐 남아 일렁이는 작은 불꽃 수
    bubbles: number;         // 떠오르는 방울 수
}

const NONE: IHitStyle = {
    life: 0.5, flash: null, flashSize: 0, ring: null, ringSize: 0, crackle: 0, drops: 0, dropKey: "dot", dropColor: WHITE, dropAdd: true,
    dropSpeed: 100, dropGravity: 0, dropSize: 1.4, dropUp: false, flames: 0, bubbles: 0,
};

export const HIT_STYLES: Record<string, IHitStyle> = {
    none: NONE,
    fire: { ...NONE, life: 1.0, flash: [1, 0.6, 0.2], flashSize: 70, drops: 12, dropColor: [1, 0.72, 0.25], dropSpeed: 100, dropGravity: -80, dropSize: 2.2, flames: 5 },
    electric: { ...NONE, life: 0.45, flash: [1, 0.95, 0.5], flashSize: 84, crackle: 9, drops: 8, dropColor: [1, 0.97, 0.7], dropSpeed: 190, dropSize: 1.6 },
    water: { ...NONE, life: 0.6, flash: [0.7, 0.9, 1], flashSize: 52, ring: [0.6, 0.85, 1], ringSize: 48, drops: 16, dropKey: "drop", dropColor: [0.7, 0.9, 1], dropAdd: false, dropSpeed: 150, dropGravity: 360, dropSize: 1.9, dropUp: true },
    ice: { ...NONE, life: 0.6, flash: [0.8, 0.95, 1], flashSize: 60, ring: [0.75, 0.93, 1], ringSize: 38, drops: 10, dropKey: "shard", dropColor: [0.8, 0.95, 1], dropAdd: false, dropSpeed: 130, dropGravity: 240, dropSize: 1.5, dropUp: true },
    grass: { ...NONE, life: 0.7, flash: [0.6, 1, 0.5], flashSize: 48, drops: 9, dropKey: "leaf", dropColor: [0.4, 0.85, 0.3], dropAdd: false, dropSpeed: 100, dropGravity: 130, dropSize: 2.2, dropUp: true },
    poison: { ...NONE, life: 0.8, flash: [0.75, 0.4, 0.95], flashSize: 54, drops: 6, dropColor: [0.8, 0.5, 1], dropSpeed: 70, dropGravity: -20, dropSize: 2, bubbles: 6 },
};

// 이 타입에 피격 효과가 정의돼 있는지
export const HasHitStyle = (_type: string) => String(_type ?? "").toLowerCase() in HIT_STYLES && String(_type).toLowerCase() != "none";

// 옵션: type(타입 이름), small(지속형 빔처럼 자주 터지는 경우 절반 규모), 색 = color 는 쓰지 않는다
// 타입별 피격 효과. 같은 틀에서 번쩍임, 물결, 전기 균열, 튀는 알갱이, 남는 불꽃, 방울을 종류 표에 따라 켜고 끈다
export class CEffectTypeHit extends CEffectSubject
{
    mStyle: IHitStyle = NONE;
    mFlash: CPaint2D = null;
    mRing: CEffectRing = null;
    mCrackle: CBoltLines = null;
    mCrackleSegs: number[] = [];
    mCrackleN = 0;
    mDrops: CEffectSprite[] = [];
    mFlameFill: CEffectSprite[] = [];
    mFlameHot: CEffectSprite[] = [];
    mBubbles: CEffectRing[] = [];

    protected Build(_o: IEffectOption)
    {
        const st = this.mStyle = PickStyle(HIT_STYLES, String(_o.type ?? "").toLowerCase(), "none", _o, ["drops", "flames", "bubbles", "crackle"]);
        const k = _o.small ? 0.5 : 1, n = (v: number) => v ? Math.max(1, Math.round(v * k)) : 0;
        this.mLife = _o.life ?? st.life * (_o.small ? 0.7 : 1);
        const pal = FLAME_PALETTES.fire;
        if (st.flash) this.mFlash = this.AddGlow(st.flashSize, st.flashSize, st.flash);
        if (st.ring) this.mRing = CEffectPiece.Ring(this, st.ring, true, st.ring);
        this.mCrackleN = n(st.crackle);
        if (this.mCrackleN) this.mCrackle = new CBoltLines(this, this.mCrackleN * 10, [1, 0.72, 0.04], Mix([1, 0.72, 0.04], WHITE, 0.55));
        for (let i = 0; i < n(st.drops); i++) this.mDrops.push(CEffectPiece.Sprite(this, st.dropKey, 1, st.dropColor, st.dropAdd, 0.02, null, null));
        for (let i = 0; i < n(st.flames); i++)
        {
            this.mFlameFill.push(CEffectPiece.Sprite(this, "blob" + (i % 3), 1, pal.cold, false, 0.01 + i * 0.0004, null, pal.glow, true));
            this.mFlameHot.push(CEffectPiece.Sprite(this, "blob" + ((i + 1) % 3), 1, pal.hi, true, 0.012 + i * 0.0004, null, null));
        }
        for (let i = 0; i < n(st.bubbles); i++) this.mBubbles.push(CEffectPiece.Ring(this, st.dropColor, false, null));
    }

    protected Tick(_r: number, _now: number)
    {
        const st = this.mStyle, t = _r * this.mLife, early = clamp(1 - _r * 2.2, 0, 1);
        if (this.mFlash) SetGlow(this.mFlash, 0, 0, 0.01, 0.9 * early, st.flashSize * (0.6 + 0.8 * easeOut(Math.min(1, _r * 3))));
        if (this.mRing)
        {
            const r = st.ringSize * easeOut(Math.min(1, _r * 2));
            this.mRing.Place(0, 0, r, r * 0.6, 0.8 * (1 - _r), 1.6);
        }
        if (this.mCrackle)
        {
            this.mCrackleSegs.length = 0;
            GrowBurst(this.mCrackleSegs, 0, 0, this.mCrackleN, 46, Math.floor(_now / 60));
            this.mCrackle.Draw(this.mCrackleSegs, clamp(1 - _r * 1.6, 0, 1));
        }
        for (let i = 0; i < this.mDrops.length; i++)
        {
            const ang = st.dropUp ? Math.PI * (0.12 + 0.76 * rnd(i, 1)) : rnd(i, 1) * Math.PI * 2, v = st.dropSpeed * (0.5 + rnd(i, 2));
            this.mDrops[i].Place(Math.cos(ang) * v * t, Math.sin(ang) * v * t - 0.5 * st.dropGravity * t * t, rnd(i, 3) * 6.28 + t * 4, st.dropSize * (0.8 + rnd(i, 4) * 0.6), 1 - _r);
        }
        for (let i = 0; i < this.mFlameFill.length; i++)
        {
            const flick = 0.65 + 0.35 * Math.sin(_now * 0.02 + i * 2.1), size = (8 + 6 * rnd(i, 5)) * flick * (1 - 0.5 * _r);
            const x = (rnd(i, 6) - 0.5) * 34, y = (rnd(i, 7) - 0.5) * 10 + size * 0.5 + 10 * _r, a = Math.min(1, _r * 8) * clamp((1 - _r) / 0.35, 0, 1);
            this.mFlameFill[i].Place(x, y, rnd(i, 8) * 6.28, size, a);
            this.mFlameHot[i].Place(x - size * 0.1, y - size * 0.15, rnd(i, 9) * 6.28, size * 0.55, a * flick);
        }
        for (let i = 0; i < this.mBubbles.length; i++)
        {
            const x = (rnd(i, 10) - 0.5) * 26, y = -4 + 34 * _r * (0.6 + 0.5 * rnd(i, 11)), r = 3.5 + 3.5 * rnd(i, 12);
            this.mBubbles[i].Place(x, -y, r, r, 0.7 * (1 - _r), 1.2);
        }
    }
}

CEffectMgr.Register("typeHit", () => new CEffectTypeHit(), 0.6);
