import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { clamp, easeOut, envelope } from "./CEffectMath.js";
import { CEffectPrim, TRGB } from "./CEffectPrim.js";

export interface IEffectOption
{
    color?: TRGB;
    life?: number;
    size?: number;
    scale?: number;
    rot?: number;
    z?: number;
    vx?: number;
    vy?: number;
    fixR?: number;
    fixNow?: number;
    [key: string]: any;
}

const sPos = new CVec3();
const sRot = new CVec3();

// 진행도 r(0~1)로 조각들을 배치하는 이펙트의 얇은 베이스. 수명과 파괴만 맡는다
export abstract class CEffectSubject extends CSubject
{
    mLife = 0.4;
    mColor: TRGB = [1, 1, 1];
    mSize = 30;
    mVx: number = null;
    mVy: number = null;
    mFixR: number = null;
    mFixNow = 0;
    private mTime = 0;
    private mReady = false;
    private mDriven = false;
    static sTimeScale = 1;

    Setup(_opt: IEffectOption, _life: number)
    {
        this.mLife = _opt.life ?? _life;
        if (_opt.color != null) this.mColor = _opt.color;
        if (_opt.size != null) this.mSize = _opt.size;
        this.mVx = _opt.vx ?? null;
        this.mVy = _opt.vy ?? null;
        this.mFixR = _opt.fixR ?? null;
        this.mFixNow = _opt.fixNow ?? 0;
        this.Build(_opt);
        this.Tick(this.mFixR ?? 0, this.mFixNow || performance.now());
        this.mReady = true;
    }

    // 시뮬레이션이 위치와 속도를 직접 주는 경우(투사체). 스스로 움직이거나 수명으로 사라지지 않으며, 끝나면 호출한 쪽이 Destroy 한다
    Drive(_x: number, _y: number, _vx: number, _vy: number)
    {
        this.mDriven = true;
        this.mVx = _vx;
        this.mVy = _vy;
        sPos.mF32A[0] = _x;
        sPos.mF32A[1] = _y;
        sPos.mF32A[2] = this.GetPos().z;
        this.SetPos(sPos);
        sRot.mF32A[2] = Math.atan2(_vy, _vx == 0 && _vy == 0 ? 1 : _vx);
        this.SetRot(sRot);
    }

    // 시간이 아니라 외부 진행도(0~1)로 움직이는 경우(시뮬레이션 단계). 끝나면 호출한 쪽이 Destroy 한다
    SetProgress(_r: number)
    {
        this.mFixR = _r;
        this.mFixNow = 0;
    }

    // 조각을 풀에서 꺼내 붙인다. 한 번만 호출된다
    protected abstract Build(_opt: IEffectOption): void;

    // 진행도 r 로 조각을 배치한다. now 는 ms
    protected abstract Tick(_r: number, _now: number): void;

    override SubjectUpdate(_update: CUpdate)
    {
        super.SubjectUpdate(_update);
        if (!this.mReady) return;
        if (this.mFixR != null)
        {
            this.Tick(this.mFixR, this.mFixNow || performance.now());
            return;
        }
        const dt = _update.DeltaTime() * CEffectSubject.sTimeScale;
        if (!this.mDriven && (this.mVx != null || this.mVy != null))
        {
            const p = this.GetPos();
            sPos.mF32A[0] = p.x + (this.mVx ?? 0) * dt;
            sPos.mF32A[1] = p.y + (this.mVy ?? 0) * dt;
            sPos.mF32A[2] = p.z;
            this.SetPos(sPos);
            sRot.mF32A[2] = Math.atan2(this.mVy ?? 0, this.mVx ?? 1);
            this.SetRot(sRot);
        }
        this.mTime += dt;
        if (!this.mDriven && this.mTime >= this.mLife)
        {
            this.Destroy();
            return;
        }
        this.Tick(this.mTime / this.mLife, performance.now());
    }

    // 가산 글로우 페인트를 만들어 붙인다. 위치와 알파는 SetGlow 로 갱신한다
    protected AddGlow(_w: number, _h: number, _c: TRGB): CPaint2D
    {
        const g = CEffectPrim.Glow(_w, _h, _c);
        this.PushComp(g);
        return g;
    }

    toJSON(): { class: string; }
    {
        return { class: "" };
    }
}

// 시뮬레이션이 길이를 계속 알려주는 지속형 이펙트(빔, 번개, 화염 줄기). Stop() 하면 짧게 사라진 뒤 스스로 파괴된다
// track 옵션이 없으면 life 동안 한 번 뻗었다 사라지는 연출로 동작한다
export abstract class CEffectSustain extends CEffectSubject
{
    protected mLen = 320;
    protected mTrack = false;
    protected mReach = 0;
    protected mT0 = 0;
    protected mStop = 0;
    // Advance 가 채우는 이번 프레임 값: 불투명도, 머리·꼬리 위치(길이 방향), 머리 구체 불투명도 배율
    protected mA = 0;
    protected mHead = 0;
    protected mTail = 0;
    protected mHv = 1;

    protected BeginSustain(_o: IEffectOption, _defLen: number)
    {
        this.mLen = _o.len ?? _defLen;
        this.mTrack = !!_o.track;
        this.mReach = this.mLen;
        this.mT0 = performance.now();
    }

    // 추적 모드: 발사자에서 끝점까지의 길이를 매 프레임 알려준다
    SetReach(_len: number)
    {
        this.mReach = _len;
        this.mLen = Math.max(30, _len);
    }

    Stop()
    {
        if (!this.mStop) this.mStop = performance.now();
    }

    // 시작한 뒤 흐른 초
    protected Clock(_now: number) { return (_now - this.mT0) / 1000; }

    // 꺼지는 중이면 1에서 0 으로 내려가고, 아니면 1. 0 이 되면 호출한 쪽이 Destroy 한다
    protected Fade(_now: number, _ms: number) { return this.mStop ? 1 - clamp((_now - this.mStop) / _ms, 0, 1) : 1; }

    // 이번 프레임의 불투명도와 머리·꼬리 위치를 mA, mHead, mTail, mHv 에 채운다. 이미 꺼져서 파괴했으면 false
    protected Advance(_r: number, _now: number, _fadeMs: number): boolean
    {
        if (this.mTrack)
        {
            const clock = this.Clock(_now), fade = this.Fade(_now, _fadeMs);
            if (this.mStop && fade <= 0) { this.Destroy(); return false; }
            this.mA = clamp(clock / 0.06, 0, 1) * fade;
            this.mHead = this.mReach * easeOut(clamp(clock / 0.1, 0, 1));
            this.mTail = 0;
            this.mHv = 1;
        }
        else
        {
            this.mA = clamp(envelope(_r, 0.04, 0.22), 0, 1);
            this.mHead = this.mLen * easeOut(clamp(_r / 0.32, 0, 1));
            this.mTail = this.mLen * clamp((_r - 0.5) / 0.38, 0, 1) * 0.94;
            this.mHv = 1 - clamp((_r - 0.5) / 0.3, 0, 1);
        }
        return true;
    }
}

// 이름으로 종류 표에서 값 묶음을 고르고, 옵션으로 넘어온 같은 이름의 값(keys)만 덮어쓴다
export function PickStyle<T extends object>(_table: Record<string, T>, _name: string, _fallback: string, _o: { [key: string]: any }, _keys: (keyof T & string)[]): T
{
    const st: T = { ...(_table[_name] ?? _table[_fallback]) };
    for (const k of _keys) if (_o[k] != null) st[k] = _o[k];
    return st;
}
