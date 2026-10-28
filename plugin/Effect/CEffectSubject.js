import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { clamp, easeOut, envelope } from "./CEffectMath.js";
import { CEffectPrim } from "./CEffectPrim.js";
const sPos = new CVec3();
const sRot = new CVec3();
export class CEffectSubject extends CSubject {
    mLife = 0.4;
    mColor = [1, 1, 1];
    mSize = 30;
    mVx = null;
    mVy = null;
    mFixR = null;
    mFixNow = 0;
    mTime = 0;
    mReady = false;
    mDriven = false;
    static sTimeScale = 1;
    Setup(_opt, _life) {
        this.mLife = _opt.life ?? _life;
        if (_opt.color != null)
            this.mColor = _opt.color;
        if (_opt.size != null)
            this.mSize = _opt.size;
        this.mVx = _opt.vx ?? null;
        this.mVy = _opt.vy ?? null;
        this.mFixR = _opt.fixR ?? null;
        this.mFixNow = _opt.fixNow ?? 0;
        this.Build(_opt);
        this.Tick(this.mFixR ?? 0, this.mFixNow || performance.now());
        this.mReady = true;
    }
    Drive(_x, _y, _vx, _vy) {
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
    SetProgress(_r) {
        this.mFixR = _r;
        this.mFixNow = 0;
    }
    SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        if (!this.mReady)
            return;
        if (this.mFixR != null) {
            this.Tick(this.mFixR, this.mFixNow || performance.now());
            return;
        }
        const dt = _update.DeltaTime() * CEffectSubject.sTimeScale;
        if (!this.mDriven && (this.mVx != null || this.mVy != null)) {
            const p = this.GetPos();
            sPos.mF32A[0] = p.x + (this.mVx ?? 0) * dt;
            sPos.mF32A[1] = p.y + (this.mVy ?? 0) * dt;
            sPos.mF32A[2] = p.z;
            this.SetPos(sPos);
            sRot.mF32A[2] = Math.atan2(this.mVy ?? 0, this.mVx ?? 1);
            this.SetRot(sRot);
        }
        this.mTime += dt;
        if (!this.mDriven && this.mTime >= this.mLife) {
            this.Destroy();
            return;
        }
        this.Tick(this.mTime / this.mLife, performance.now());
    }
    AddGlow(_w, _h, _c) {
        const g = CEffectPrim.Glow(_w, _h, _c);
        this.PushComp(g);
        return g;
    }
    toJSON() {
        return { class: "" };
    }
}
export class CEffectSustain extends CEffectSubject {
    mLen = 320;
    mTrack = false;
    mReach = 0;
    mT0 = 0;
    mStop = 0;
    mA = 0;
    mHead = 0;
    mTail = 0;
    mHv = 1;
    BeginSustain(_o, _defLen) {
        this.mLen = _o.len ?? _defLen;
        this.mTrack = !!_o.track;
        this.mReach = this.mLen;
        this.mT0 = performance.now();
    }
    SetReach(_len) {
        this.mReach = _len;
        this.mLen = Math.max(30, _len);
    }
    Stop() {
        if (!this.mStop)
            this.mStop = performance.now();
    }
    Clock(_now) { return (_now - this.mT0) / 1000; }
    Fade(_now, _ms) { return this.mStop ? 1 - clamp((_now - this.mStop) / _ms, 0, 1) : 1; }
    Advance(_r, _now, _fadeMs) {
        if (this.mTrack) {
            const clock = this.Clock(_now), fade = this.Fade(_now, _fadeMs);
            if (this.mStop && fade <= 0) {
                this.Destroy();
                return false;
            }
            this.mA = clamp(clock / 0.06, 0, 1) * fade;
            this.mHead = this.mReach * easeOut(clamp(clock / 0.1, 0, 1));
            this.mTail = 0;
            this.mHv = 1;
        }
        else {
            this.mA = clamp(envelope(_r, 0.04, 0.22), 0, 1);
            this.mHead = this.mLen * easeOut(clamp(_r / 0.32, 0, 1));
            this.mTail = this.mLen * clamp((_r - 0.5) / 0.38, 0, 1) * 0.94;
            this.mHv = 1 - clamp((_r - 0.5) / 0.3, 0, 1);
        }
        return true;
    }
}
export function PickStyle(_table, _name, _fallback, _o, _keys) {
    const st = { ...(_table[_name] ?? _table[_fallback]) };
    for (const k of _keys)
        if (_o[k] != null)
            st[k] = _o[k];
    return st;
}
