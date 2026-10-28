import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CH5Canvas } from "../../artgine/render/CH5Canvas.js";
import { NameHash } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectDisc, CEffectLine, CEffectPiece, CEffectSprite, SetAlpha, SetPos, SetSize } from "./CEffectPiece.js";
import { CEffectPrim, HexRGB, TRGB } from "./CEffectPrim.js";
import { CEffectShape } from "./CEffectShape.js";
import { CEffectSubject, IEffectOption } from "./CEffectSubject.js";

const H = HexRGB;
const NON_ADD = ["rock", "quake", "stone", "shadow", "dark", "sludge", "seed"];
const BEAM_LEN = 40;

const jetCache = new Map<string, { key: string, w: number, h: number }>();

// 물줄기 몸통: 꼬리는 투명하고 머리로 갈수록 밝아지는 그라데이션. 길이/반지름 조합마다 한 번만 굽는다
function JetTex(_e: number, _i: number): { key: string, w: number, h: number }
{
    const id = _e + "_" + _i.toFixed(1);
    let c = jetCache.get(id);
    if (c) return c;
    const w = Math.ceil(_e + _i + 8), h = Math.ceil(2 * _i + 8), key = "fx/jet_" + id + ".tex";
    const ox = _e + 4, oy = _i + 4;
    CH5Canvas.Init(w, h);
    CH5Canvas.FillLinearGradient(ox - _e, oy, ox + _i, oy, [{ per: 0, color: "#4eacff00" }, { per: 1, color: "#8befff" }]);
    CH5Canvas.AddCmd([
        CH5Canvas.Cmd("beginPath", []), CH5Canvas.Cmd("moveTo", [ox - _e, oy - 0.3 * _i]),
        CH5Canvas.Cmd("quadraticCurveTo", [ox - _i, oy - _i, ox + _i, oy]), CH5Canvas.Cmd("quadraticCurveTo", [ox - _i, oy + _i, ox - _e, oy + 0.3 * _i]),
        CH5Canvas.Cmd("fill", []),
    ]);
    CH5Canvas.Draw();
    const tex = CH5Canvas.GetNewTex();
    const fw = CEffectMgr.sCanvas.GetFrame();
    fw.Ren().BuildTexture(tex);
    fw.Res().Push(key, tex);
    c = { key, w, h };
    jetCache.set(id, c);
    return c;
}

// 투사체 공통. 옵션: family, name(기술 이름), radius(5~32), type, vx, vy, beam{x,y}(빔 시작, 월드), trail(기본 true)
// 패밀리별 클래스가 Make 에서 조각을 만들고 Anim(초 단위 시간)에서 배치한다
export abstract class CEffectProj extends CEffectSubject
{
    protected mName = "";
    protected mFamily = "energy";
    protected mAdd = true;
    protected mB = 0;
    protected mI = 14;
    protected mRad = 14;
    protected mCount = 0;
    protected mType = "";
    protected mTrail = true;
    protected mBeam: { x: number, y: number } = null;
    protected mBeamA: CEffectLine[] = [];
    protected mBeamB: CEffectLine[] = [];
    protected mBeamOff = false;
    protected mT0 = 0;
    protected mLastTrail = 0;
    protected mAcc = 0;

    protected Build(_o: IEffectOption)
    {
        this.mName = _o.name || "";
        this.mFamily = _o.family || "energy";
        this.mType = _o.type || "";
        this.mAdd = !NON_ADD.includes(_o.family || "energy");
        const hs = NameHash(this.mName);
        this.mB = hs % 5;
        this.mRad = clamp(_o.radius ?? 14, 5, 32);
        this.mI = this.mRad * (0.9 + (hs % 7) * 0.035);
        this.mTrail = _o.trail !== false;
        this.mBeam = _o.beam ?? null;
        this.mT0 = performance.now();
        this.mLastTrail = this.mT0;
        this.Make();
        if (this.mBeam)
        {
            const c2: TRGB = this.mType == "Water" ? H("#c6f8ff") : H("#fff9df");
            for (let k = 0; k < 12; k++)
            {
                this.mBeamA.push(CEffectPiece.Line(this, this.mColor, true, this.mColor, BEAM_LEN));
                this.mBeamB.push(CEffectPiece.Line(this, c2, true, this.mColor, BEAM_LEN));
            }
        }
    }

    protected abstract Make(): void;
    protected abstract Anim(_g: number): void;

    protected L(_rgb: TRGB, _maxLen = 20): CEffectLine
    {
        return CEffectPiece.Line(this, _rgb, this.mAdd, this.mColor, _maxLen);
    }

    protected P(_key: string, _units: number, _rgb: TRGB = null): CEffectSprite
    {
        const out = _key == "star" || _key == "shard" ? H("#ffffff") : _key == "star4" ? this.mColor : null;
        return CEffectPiece.Sprite(this, _key, _units, _rgb, this.mAdd, 0, out, _rgb ?? this.mColor);
    }

    protected R(_ring: boolean, _rgb: TRGB, _lw = 1.5): CEffectDisc
    {
        this.mCount++;
        return CEffectPiece.Disc(this, _ring, _rgb, this.mAdd, this.mColor, _lw, 0.0002 * this.mCount);
    }

    protected Tick(_r: number, _now: number)
    {
        this.Anim(_now / 1000);
        const p = this.GetPos();
        const th = Math.atan2(this.mVy ?? 0, this.mVx ?? 1);
        if (this.mTrail && this.mFixR == null)
        {
            this.mAcc += (_now - this.mLastTrail) / 1000;
            this.mLastTrail = _now;
            while (this.mAcc > 0.04)
            {
                this.mAcc -= 0.04;
                CEffectMgr.Burst(p.x - Math.cos(th) * this.mRad, p.y - Math.sin(th) * this.mRad, { color: this.mColor, count: 1, speed: 30, angle: th + Math.PI, small: true });
            }
        }
        if (this.mBeam == null) return;
        if (_now - this.mT0 < 650)
        {
            this.mBeamOff = false;
            const b = this.mBeam;
            const dx = p.x - b.x, dy = p.y - b.y, len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const cs = Math.cos(-th), sn = Math.sin(-th);
            const local = (wx: number, wy: number): [number, number] =>
            {
                const rx = wx - p.x, ry = wy - p.y;
                return [rx * cs - ry * sn, -(rx * sn + ry * cs)];
            };
            let [ax, ay] = local(b.x, b.y);
            for (let k = 1; k <= 12; k++)
            {
                const a = k / 12;
                const wob = (this.mType == "Electric" ? 4 * Math.sin(9 * k + 0.08 * _now) : 2 * Math.sin(2 * k + 0.03 * _now)) * Math.sin(a * Math.PI);
                const [x, y] = local(b.x + dx * a + nx * wob, b.y + dy * a + ny * wob);
                const w = this.mName == "hydropump" ? 12 : this.mType == "Fire" ? 10 : 5;
                this.mBeamA[k - 1].Place(ax, ay, x, y, w, 0.53);
                this.mBeamB[k - 1].Place(ax, ay, x, y, this.mType == "Water" ? 3 : 1.8, 0.8);
                ax = x; ay = y;
            }
        }
        else if (!this.mBeamOff)
        {
            this.mBeamOff = true;
            for (const l of this.mBeamA) l.Place(0, 0, 0, 0, 1, 0);
            for (const l of this.mBeamB) l.Place(0, 0, 0, 0, 1, 0);
        }
    }
}

export class CProjFireburst extends CEffectProj
{
    mO: CEffectLine[] = [];
    mP: CEffectLine[] = [];
    mD: CEffectDisc[] = [];
    static kPts = [[-0.2, -0.9, 0.25, 0.85], [-0.9, -0.4, 0.8, -0.4], [-0.7, 0.8, 0.65, -0.95]];

    protected Make()
    {
        for (let k = 0; k < 3; k++) { this.mO.push(this.L(H("#fa7e37"))); this.mP.push(this.L(H("#fff5b4"))); }
        for (let e = 0; e < 4; e++) this.mD.push(this.R(false, H("#ff983a")));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        const rot = 0.08 * Math.sin(8 * g), cs = Math.cos(rot), sn = Math.sin(rot);
        CProjFireburst.kPts.forEach((q, k) =>
        {
            const ax = (q[0] * cs - q[1] * sn) * i, ay = (q[0] * sn + q[1] * cs) * i, bx = (q[2] * cs - q[3] * sn) * i, by = (q[2] * sn + q[3] * cs) * i;
            this.mO[k].Place(ax, ay, bx, by, 0.54 * i, 1);
            this.mP[k].Place(ax, ay, bx, by, 0.17 * i, 1);
        });
        for (let e = 0; e < 4; e++) this.mD[e].Place(-i - 11 * e, Math.sin(14 * g + e) * i * 0.5, 7 - e, 7 - e, 0, 0.6 - 0.12 * e);
    }
}

export class CProjFlame extends CEffectProj
{
    mLobes: CEffectSprite[] = [];

    protected Make()
    {
        for (let e = 0; e < 7; e++) this.mLobes.push(this.P("lobe", this.mI, e > 3 ? H("#e65340") : e > 1 ? H("#ffae42") : H("#fff5b6")));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let e = 0; e < 7; e++)
        {
            const a = Math.sin(24 * g + e) * e * 1.4;
            this.mLobes[e].Place(-9 * e, -a, 0, Math.max(0.2, (i - e * 0.6) / i), 1 - e / 8);
        }
    }
}

export class CProjBubbles extends CEffectProj
{
    mBb: { f: CEffectDisc, r: CEffectDisc, h: CEffectDisc }[] = [];

    protected Make()
    {
        for (let e = 0; e < 8; e++) this.mBb.push({ f: this.R(false, H("#65d5ef")), r: this.R(true, H("#c8fdff"), 1.5), h: this.R(false, H("#ffffff")) });
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let e = 0; e < 8; e++)
        {
            const a = i * (0.35 + (e % 3) * 0.17), x = -8 * e, y = Math.sin(2.4 * e + 4 * g) * i * 0.75, al = 1 - 0.075 * e;
            this.mBb[e].f.Place(x, y, a, a, 0, al * 0.27);
            this.mBb[e].r.Place(x, y, a, a, 0, al);
            this.mBb[e].h.Place(x - 0.3 * a, y - 0.3 * a, 0.16 * a, 0.16 * a, 0, al);
        }
    }
}

export class CProjWave extends CEffectProj
{
    mArcs: CEffectLine[][] = [];
    mDots: CEffectDisc[] = [];

    protected Make()
    {
        for (let e = 0; e < 3; e++) this.mArcs.push(Array.from({ length: 8 }, () => this.L(e ? H("#67cafa") : H("#ddfbff"))));
        for (let e = 0; e < 6; e++) this.mDots.push(this.R(false, H("#e8ffff")));
    }

    private Bez(_t: number, _e: number): [number, number]
    {
        const i = this.mI;
        const x0 = -i - 9 * _e, y0 = -1.5 * i, x1 = 0.7 * i - 9 * _e, y1 = -1.6 * i, x2 = 1.15 * i - 9 * _e, y2 = 0.9 * i, x3 = -i - 9 * _e, y3 = 1.5 * i;
        const u = 1 - _t;
        return [u * u * u * x0 + 3 * u * u * _t * x1 + 3 * u * _t * _t * x2 + _t * _t * _t * x3, u * u * u * y0 + 3 * u * u * _t * y1 + 3 * u * _t * _t * y2 + _t * _t * _t * y3];
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let e = 2; e >= 0; e--)
            for (let k = 0; k < 8; k++)
            {
                const a = this.Bez(k / 8, e), z = this.Bez((k + 1) / 8, e);
                this.mArcs[e][k].Place(a[0], a[1], z[0], z[1], 6 - e, 1 - 0.25 * e);
            }
        for (let e = 0; e < 6; e++) this.mDots[e].Place(-i + 5 * Math.cos(e + 5 * g), (e - 2.5) * i * 0.5, 2.1, 2.1, 0, 1);
    }
}

export class CProjWaterPulse extends CEffectProj
{
    mEl: CEffectDisc[] = [];
    mCore: CEffectDisc;

    protected Make()
    {
        for (let o = 0; o < 4; o++) this.mEl.push(this.R(true, o % 2 ? H("#78dafa") : H("#e0ffff"), 2.5));
        this.mCore = this.R(false, H("#d1faff"));
    }

    protected Anim()
    {
        const i = this.mI;
        for (let o = 0; o < 4; o++) this.mEl[o].Place(-12 * o, 0, i * (0.6 + 0.12 * o), i * (1 + 0.18 * o), 0, 1 - 0.2 * o);
        this.mCore.Place(0, 0, 0.48 * i, 0.48 * i, 0, 1);
    }
}

export class CProjWaterJet extends CEffectProj
{
    mBody: CPaint2D;
    mLine: CEffectLine;
    mGlow: CEffectLine;
    mLen = 65;

    protected Make()
    {
        const i = this.mI;
        this.mLen = this.mName == "hydropump" ? 100 : 65;
        const jet = JetTex(this.mLen, i);
        this.mBody = new CPaint2D(jet.key, new CVec2(jet.w, jet.h));
        SetPos(this.mBody, jet.w / 2 - (this.mLen + 4), 0);
        CEffectPrim.Additive(this.mBody);
        CEffectPrim.NoCut(this.mBody);
        this.PushComp(this.mBody);
        this.mLine = this.L(H("#e3ffff"), this.mLen);
        this.mGlow = CEffectPiece.Line(this, this.mColor, true, this.mColor, this.mLen + i);
        this.mGlow.PlaceGlow(-this.mLen, 0, i, 0, 4, 0.3);
    }

    protected Anim(g: number)
    {
        this.mLine.Place(-0.65 * this.mLen, 2 * Math.sin(19 * g), 0.75 * this.mI, 0, 2, 1);
    }
}

export class CProjLeaves extends CEffectProj
{
    mLv: CEffectSprite[] = [];
    mN = 3;

    protected Make()
    {
        this.mN = this.mFamily == "leafstorm" ? 7 : 3;
        for (let a = 0; a < this.mN; a++) this.mLv.push(this.P("leaf", this.mI * (a ? 0.6 : 1)));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let a = 0; a < this.mN; a++)
        {
            const l = 12 * g + a * Math.PI * 2 / this.mN, s = a ? 0.85 * i : 0;
            this.mLv[a].Place(Math.cos(l) * s - 5 * a, -Math.sin(l) * s, -l, 1, 1);
        }
    }
}

export class CProjSeed extends CEffectProj
{
    mS: CEffectSprite;

    protected Make()
    {
        this.mS = this.P("seed", this.mI);
    }

    protected Anim(g: number)
    {
        this.mS.Place(0, 0, -5 * g, 1, 1);
    }
}

export class CProjElectricOrb extends CEffectProj
{
    mOrb: CEffectDisc;
    mRing: CEffectDisc;
    mZ: CEffectLine[][] = [];

    protected Make()
    {
        this.mOrb = this.R(false, H("#f9e476"));
        this.mRing = this.R(true, H("#fffddc"));
        for (let o = 0; o < 3; o++) this.mZ.push(Array.from({ length: 6 }, () => this.L(H("#fff7b0"))));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        this.mOrb.Place(0, 0, i, i, 0, 0.8);
        this.mRing.Place(0, 0, i, i, 0, 1);
        for (let o = 0; o < 3; o++)
        {
            const rot = (o + 1) * Math.PI * 2 / 3, cs = Math.cos(rot), sn = Math.sin(rot);
            let px = -1.5 * i, py = 0;
            for (let e = 1; e < 7; e++)
            {
                const x = -1.5 * i + e * i * 0.5, y = Math.sin(40 * g + 9 * e + o) * i * 0.4;
                this.mZ[o][e - 1].Place(px * cs - py * sn, px * sn + py * cs, x * cs - y * sn, x * sn + y * cs, 2, 1);
                px = x; py = y;
            }
        }
    }
}

export class CProjLightning extends CEffectProj
{
    mY: CEffectLine[] = [];
    mW: CEffectLine[] = [];
    mTh: CEffectLine[] = [];
    mE0 = 65;

    protected Make()
    {
        this.mE0 = this.mName == "thunder" ? 100 : 65;
        for (let k = 0; k < 8; k++) { this.mY.push(this.L(H("#ffd34b"), 20)); this.mW.push(this.L(H("#fffdeb"), 20)); }
        if (this.mName == "thunder") for (let k = 0; k < 3; k++) this.mTh.push(this.L(H("#fff9bb"), 40));
    }

    protected Anim(g: number)
    {
        const i = this.mI, e0 = this.mE0;
        for (let o = 1; o >= 0; o--)
        {
            let px = -e0, py = 0;
            for (let k = 1; k <= 8; k++)
            {
                const x = k * e0 / 8 - e0, y = k == 8 ? 0 : Math.sin(48 * g + 7 * k + this.mB) * i * 0.65;
                (o ? this.mY : this.mW)[k - 1].Place(px, py, x, y, o ? 5 : 1.5, 1);
                px = x; py = y;
            }
        }
        if (this.mTh.length)
        {
            this.mTh[0].Place(-i, -2 * i, 0, -i, 1.5, 1);
            this.mTh[1].Place(0, -i, -0.35 * i, 0.4 * i, 1.5, 1);
            this.mTh[2].Place(-0.35 * i, 0.4 * i, 0.5 * i, i, 1.5, 1);
        }
    }
}

export class CProjSnow extends CEffectProj
{
    mFl: CEffectSprite[] = [];

    protected Make()
    {
        for (let e = 0; e < 6; e++) this.mFl.push(this.P("snow", (4 + (e % 3) * 3) / 9, e % 2 ? H("#c3f6ff") : H("#ffffff")));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let e = 0; e < 6; e++) this.mFl[e].Place(-8 * e, -Math.sin(2 * e + 3 * g) * i * 1.2, -(g + e), 1, 1);
    }
}

// 얼음, 돌 조각
export class CProjShard extends CEffectProj
{
    mSh: CEffectSprite[] = [];

    protected Make()
    {
        const ice = this.mFamily == "ice";
        for (let e = 0; e < 3; e++) this.mSh.push(this.P("shard", this.mI * (1 - 0.2 * e), ice ? H("#b7f2ff") : H("#b5b2a5")));
    }

    protected Anim(g: number)
    {
        for (let e = 0; e < 3; e++) this.mSh[e].Place(-12 * e, -Math.sin(9 * g + e) * e * 4, -0.12 * Math.sin(3 * g + e), 1, 1 - 0.25 * e);
    }
}

// 독, 슬러지, 포자, 상태 변화 구름
export class CProjSludge extends CEffectProj
{
    mDd: CEffectDisc[] = [];
    mRr: CEffectDisc[] = [];
    mEyes: CEffectDisc[] = [];
    mMouth: CEffectLine = null;
    mTox = false;
    mPw = false;

    protected Make()
    {
        this.mTox = this.mFamily == "toxic";
        this.mPw = this.mFamily == "spores" || this.mName.includes("gas") || this.mName.includes("powder");
        const col = this.mTox ? H("#cb70f1") : this.mColor;
        for (let a = 0; a < 7; a++) this.mDd.push(this.R(false, col));
        if (!this.mPw) for (let a = 0; a < 7; a++) this.mRr.push(this.R(true, H("#ecb6ff")));
        if (this.mTox)
        {
            this.mEyes = [this.R(false, H("#f7dcff")), this.R(false, H("#f7dcff"))];
            this.mMouth = this.L(H("#f7dcff"));
        }
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let a = 0; a < 7; a++)
        {
            const s = 2 * g + 2.4 * a, r = i * (this.mPw ? 0.27 : 0.44), x = -4 * a + Math.cos(s) * i * 0.55, y = Math.sin(s) * i * 0.7, al = 0.9 - 0.08 * a;
            this.mDd[a].Place(x, y, r, r, 0, al);
            if (this.mRr.length) this.mRr[a].Place(x, y, r, r, 0, al);
        }
        if (this.mTox)
        {
            this.mEyes[0].Place(-0.3 * i, -0.1 * i, 2, 2, 0, 1);
            this.mEyes[1].Place(0.3 * i, -0.1 * i, 2, 2, 0, 1);
            this.mMouth.Place(-0.22 * i, 0.34 * i, 0.22 * i, 0.34 * i, 1, 1);
        }
    }
}

export class CProjNeedle extends CEffectProj
{
    mN0: CEffectSprite;
    mN1: CEffectSprite;
    mN2: CEffectSprite;

    protected Make()
    {
        const i = this.mI;
        this.mN0 = this.P("shard", 1.1 * i, H("#d1baf4"));
        this.mN1 = this.P("shard", 0.6 * i, H("#d1baf4"));
        this.mN2 = this.P("shard", 0.6 * i, H("#d1baf4"));
    }

    protected Anim()
    {
        const i = this.mI;
        this.mN0.Place(0, 0, 0, 1, 1);
        this.mN1.Place(-2 * i, -0.65 * i, -0.15, 1, 1);
        this.mN2.Place(-2 * i, 0.65 * i, 0.15, 1, 1);
    }
}

export class CProjRock extends CEffectProj
{
    mTr: CEffectDisc[] = [];
    mRk: CEffectSprite;
    mMet = false;

    protected Make()
    {
        this.mMet = this.mFamily == "meteor";
        if (this.mMet) for (let e = 0; e < 6; e++) this.mTr.push(this.R(false, e > 2 ? H("#947af2") : H("#ffbf7f")));
        this.mRk = this.P(this.mMet ? "meteor" : "rock", this.mI);
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        if (this.mMet) for (let e = 5; e >= 0; e--) this.mTr[e].Place(-12 * e, 3 * Math.sin(e + 8 * g), i - 3 * e, i - 3 * e, 0, 0.8 - 0.1 * e);
        this.mRk.Place(0, 0, -g * (2 + 0.4 * this.mB), 1, 1);
    }
}

export class CProjWind extends CEffectProj
{
    mArcs: CEffectLine[][] = [];
    mTail: CEffectLine[] = [];
    mSound = false;

    protected Make(_o?: IEffectOption)
    {
        for (let e = 0; e < 4; e++) this.mArcs.push(Array.from({ length: 8 }, () => this.L(this.mSound ? this.mColor : e % 2 ? H("#effffc") : this.mColor)));
        if (!this.mSound) for (let k = 0; k < 4; k++) this.mTail.push(this.L(H("#ffffff"), 30));
    }

    protected Anim()
    {
        const i = this.mI;
        for (let e = 0; e < 4; e++)
        {
            const cx = -13 * e, Rr = i * (1 + 0.22 * e);
            for (let k = 0; k < 8; k++)
            {
                const a0 = -1.1 + 2.2 * k / 8, a1 = -1.1 + 2.2 * (k + 1) / 8;
                this.mArcs[e][k].Place(cx + Math.cos(a0) * Rr, Math.sin(a0) * Rr, cx + Math.cos(a1) * Rr, Math.sin(a1) * Rr, 2, 1 - 0.18 * e);
            }
        }
        if (this.mTail.length)
        {
            let px = -60, py = -i;
            for (let k = 1; k <= 4; k++)
            {
                const t = k / 4, u = 1 - t;
                const x = u * u * -60 + 2 * u * t * -15 + t * t * 0, y = u * u * -i + 2 * u * t * -1.8 * i + t * t * -0.3 * i;
                this.mTail[k - 1].Place(px, py, x, y, 1, 0.67);
                px = x; py = y;
            }
        }
    }
}

export class CProjSound extends CProjWind
{
    protected override Make()
    {
        this.mSound = true;
        super.Make();
    }
}

export class CProjPsychic extends CEffectProj
{
    mEl: CEffectDisc[] = [];
    mCore: CEffectDisc;
    mBeamy = false;

    protected Make()
    {
        const beamy = this.mBeamy;
        for (let o = 0; o < 5; o++) this.mEl.push(this.R(true, beamy ? [H("#ffb4e8"), H("#a6b8ff"), H("#fff0b8")][o % 3] : this.mColor, 2));
        this.mCore = this.R(false, H("#fff5ff"));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let o = 0; o < 5; o++) this.mEl[o].Place(-9 * o, 0, i * (0.35 + 0.06 * o), i * (1 - 0.08 * o), 0.12 * Math.sin(5 * g + o), 1 - 0.14 * o);
        this.mCore.Place(0, 0, 0.25 * i, 0.25 * i, 0, 1);
    }
}

export class CProjPsyBeam extends CProjPsychic
{
    protected override Make()
    {
        this.mBeamy = true;
        super.Make();
    }
}

export class CProjShadow extends CEffectProj
{
    mOrb: CEffectDisc;
    mOrbRing: CEffectDisc;
    mEl: CEffectDisc[] = [];
    mHi: CEffectDisc;

    protected Make()
    {
        this.mOrb = this.R(false, H("#25123e"));
        this.mOrbRing = this.R(true, this.mColor);
        for (let o = 0; o < 3; o++) this.mEl.push(this.R(true, o % 2 ? H("#edc5ff") : H("#9c6fe8"), 2.5));
        this.mHi = this.R(false, H("#d9bcff"));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        this.mOrb.Place(0, 0, 1.05 * i, 1.05 * i, 0, 0.8);
        this.mOrbRing.Place(0, 0, 1.05 * i, 1.05 * i, 0, 1);
        for (let o = 0; o < 3; o++) this.mEl[o].Place(0, 0, 1.12 * i, 0.65 * i, g * (o % 2 ? 3 : -3) + 1.2 * o, 1);
        this.mHi.Place(-0.28 * i, -0.28 * i, 0.25 * i, 0.25 * i, 0, 0.6);
    }
}

export class CProjDragon extends CEffectProj
{
    mWs: CEffectLine[][] = [];
    mHead: CEffectSprite;

    protected Make()
    {
        this.mWs = [Array.from({ length: 9 }, () => this.L(H("#927cff"))), Array.from({ length: 9 }, () => this.L(H("#e6ddff")))];
        this.mHead = CEffectPiece.Sprite(this, "arrow", 1, H("#f3d7ff"), true, 0, null, H("#f3d7ff"));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        for (let e = 0; e < 2; e++)
        {
            let px = -80, py = Math.sin(15 * g) * i * 0.7;
            for (let k = 1; k <= 9; k++)
            {
                const x = 9 * k - 80, y = Math.sin(15 * g + 0.8 * k) * i * 0.7 * (1 - k / 11);
                this.mWs[e][k - 1].Place(px, py, x, y, e ? 3 : 7, 1);
                px = x; py = y;
            }
        }
        this.mHead.Place(0, 0, 0, i, 1);
    }
}

// 별, 페어리, 달
export class CProjStar extends CEffectProj
{
    mMain: CEffectSprite;
    mTr: CEffectSprite[] = [];
    mFam = "star";

    protected Make(_o?: IEffectOption)
    {
        this.mMain = this.mFam == "moon" ? this.P("moon", this.mI) : this.P("star", this.mI, this.mFam == "star" ? H("#fff3ad") : this.mColor);
        for (let k = 0; k < 3; k++) this.mTr.push(this.P("star4", 4, H("#fff0eb")));
    }

    protected Anim(g: number)
    {
        const i = this.mI;
        this.mMain.Place(0, 0, this.mFam == "moon" ? 0 : -4 * g, 1, 1);
        for (let e = 1; e < 4; e++) this.mTr[e - 1].Place(-16 * e, -Math.sin(4 * g + e) * i * 0.7, -(g + e), 1, 1 - 0.22 * e);
    }
}

export class CProjFairy extends CProjStar
{
    protected override Make() { this.mFam = "fairy"; super.Make(); }
}

export class CProjMoon extends CProjStar
{
    protected override Make() { this.mFam = "moon"; super.Make(); }
}

// 기본 에너지 볼
export class CProjEnergy extends CEffectProj
{
    mGlow: CPaint2D;
    mGlow2: CPaint2D;
    mCoreP: CPaint2D;
    mRing: CEffectDisc;
    mDots: CEffectDisc[] = [];

    protected Make()
    {
        this.mGlow = CEffectShape.PaintWH("egA", 1, 1, this.mColor, this.mAdd);
        this.mGlow2 = CEffectShape.PaintWH("egA", 1, 1, this.mColor, this.mAdd);
        SetPos(this.mGlow2, 0, 0, -0.0001);
        SetAlpha(this.mGlow2, 0.5);
        this.PushComp(this.mGlow2);
        this.PushComp(this.mGlow);
        this.mCoreP = CEffectShape.PaintWH("egB", 1, 1, [1, 1, 1], this.mAdd);
        SetPos(this.mCoreP, 0, 0, 0.0001);
        this.PushComp(this.mCoreP);
        this.mRing = this.R(true, this.mColor);
        for (let o = 0; o < 3; o++) this.mDots.push(this.R(false, H("#ffffff")));
    }

    protected Anim(g: number)
    {
        const i = this.mI, kg = 128 / 60;
        SetSize(this.mGlow, 1.7 * i * kg, 1.7 * i * kg);
        SetSize(this.mGlow2, 2.0 * i * kg, 2.0 * i * kg);
        SetSize(this.mCoreP, 0.374 * i * kg, 0.374 * i * kg);
        this.mRing.Place(0, 0, 1.25 * i, 0.7 * i, 4 * g, 1);
        for (let o = 0; o < 3; o++)
        {
            const a = 5 * g + o * Math.PI * 2 / 3;
            this.mDots[o].Place(Math.cos(a) * i * 1.25, Math.sin(a) * i * 0.8, 2.5, 2.5, 0, 1);
        }
    }
}

// 기술 이름이 가리키는 패밀리(원본 moveVisualProfile)를 투사체 클래스로 연결한다
CEffectMgr.Register("proj", (_o: IEffectOption) =>
{
    const f = _o.family || "energy";
    if (f == "fireburst") return new CProjFireburst();
    if (f == "flame") return new CProjFlame();
    if (f == "bubbles") return new CProjBubbles();
    if (f == "wave") return new CProjWave();
    if (f == "waterpulse") return new CProjWaterPulse();
    if (f == "waterjet") return new CProjWaterJet();
    if (f == "leaves" || f == "leafstorm") return new CProjLeaves();
    if (f == "seed") return new CProjSeed();
    if (f == "electricorb") return new CProjElectricOrb();
    if (f == "lightning") return new CProjLightning();
    if (f == "snow") return new CProjSnow();
    if (f == "ice" || f == "stone") return new CProjShard();
    if (f == "toxic" || f == "sludge" || f == "spores" || f == "status") return new CProjSludge();
    if (f == "needle") return new CProjNeedle();
    if (f == "rock" || f == "quake" || f == "meteor") return new CProjRock();
    if (f == "wind") return new CProjWind();
    if (f == "sound") return new CProjSound();
    if (f == "psychic") return new CProjPsychic();
    if (f == "psybeam") return new CProjPsyBeam();
    if (f == "shadow" || f == "dark") return new CProjShadow();
    if (f == "dragon") return new CProjDragon();
    if (f == "fairy") return new CProjFairy();
    if (f == "moon") return new CProjMoon();
    if (f == "star") return new CProjStar();
    return new CProjEnergy();
}, 2);
