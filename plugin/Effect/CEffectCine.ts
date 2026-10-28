import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CH5Canvas } from "../../artgine/render/CH5Canvas.js";
import { easeOut, envelope, lerp, Mix, QuantAlpha, rnd, WHITE } from "./CEffectMath.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { clamp, CEffectDisc, CEffectLine, CEffectPiece, CEffectRing, CEffectSprite, SetAlpha, SetGlow, SetPos, SetSize, SetTint, Take } from "./CEffectPiece.js";
import { CEffectPrim, HexRGB, TRGB } from "./CEffectPrim.js";
import { CEffectShape, IShapeDef } from "./CEffectShape.js";
import { CEffectSubject, CEffectSustain, IEffectOption, PickStyle } from "./CEffectSubject.js";
import { CEffectTex } from "./CEffectTex.js";
import { CEffectText, RGBHex } from "./CEffectText.js";

const kVignette = "fx/vignette.tex";
const RAINBOW: TRGB[] = ["#ff5a5a", "#ffb35a", "#fff35a", "#6bff7a", "#5ac8ff", "#a77bff"].map(HexRGB);


type Op = [string, any];

function HexGridOps(): Op[]
{
    const o: Op[] = [["lineWidth", 1.6]];
    const R = 13;
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++)
    {
        const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
        if (d > 2) continue;
        const cx = R * 1.5 * q, cy = R * Math.sqrt(3) * (r + q / 2);
        o.push(["strokeStyle", d == 0 ? "#ffffff" : d == 1 ? "#ffffffcc" : "#ffffff66"], ["beginPath", []]);
        for (let k = 0; k <= 6; k++)
        {
            const a = k * Math.PI / 3;
            o.push([k ? "lineTo" : "moveTo", [cx + Math.cos(a) * R, cy + Math.sin(a) * R]]);
        }
        o.push(["stroke", []]);
    }
    return o;
}

function WebOps(_v: number): Op[]
{
    const o: Op[] = [["strokeStyle", "#ffffff"], ["lineWidth", 1.7]];
    const n = 7 + _v, pts: number[][][] = [];
    for (let i = 0; i < n; i++)
    {
        const ang = i * Math.PI * 2 / n + (rnd(_v + 1, i) - 0.5) * 0.5, len = 34 + rnd(_v + 3, i) * 40;
        const kink = (rnd(_v + 5, i) - 0.5) * 0.35;
        const p1 = [Math.cos(ang + kink) * len * 0.45, Math.sin(ang + kink) * len * 0.45 * 0.8];
        const p2 = [Math.cos(ang) * len, Math.sin(ang) * len * 0.8];
        pts.push([p1, p2]);
        o.push(["beginPath", []], ["moveTo", [0, 0]], ["lineTo", p1], ["lineTo", p2], ["stroke", []]);
    }
    for (const ring of [0.35, 0.6, 0.85])
    {
        for (let i = 0; i < n; i++)
        {
            if (rnd(_v + 9, i * 7 + ring * 11) < 0.25) continue;
            const a = pts[i], b = pts[(i + 1) % n];
            const ax = lerp(a[0][0], a[1][0], ring), ay = lerp(a[0][1], a[1][1], ring);
            const bx = lerp(b[0][0], b[1][0], ring), by = lerp(b[0][1], b[1][1], ring);
            o.push(["beginPath", []], ["moveTo", [ax, ay]], ["lineTo", [(ax + bx) / 2 * 0.93, (ay + by) / 2 * 0.93]], ["lineTo", [bx, by]], ["stroke", []]);
        }
    }
    return o;
}

function LongCrackOps(): Op[]
{
    const o: Op[] = [["strokeStyle", "#ffffff"], ["lineWidth", 1.2], ["beginPath", []], ["moveTo", [-250, 0]]];
    let y = 0;
    const br: number[][] = [];
    for (let x = -250; x < 250; x += 22)
    {
        y = clamp(y + (rnd(4, x) - 0.5) * 18, -34, 34);
        o.push(["lineTo", [x + 22, y]]);
        if (rnd(8, x) > 0.7) br.push([x + 22, y, (rnd(11, x) - 0.5) * 60]);
    }
    o.push(["stroke", []]);
    for (const b of br) o.push(["beginPath", []], ["moveTo", [b[0], b[1]]], ["lineTo", [b[0] + 18, b[1] + b[2] * 0.5]], ["lineTo", [b[0] + 34, b[1] + b[2]]], ["stroke", []]);
    return o;
}

function JagOps(_lw: number, _color: string): Op[]
{
    const o: Op[] = [["strokeStyle", _color], ["lineWidth", _lw], ["beginPath", []]];
    const n = 16;
    for (let k = 0; k <= n; k++)
    {
        const a = (k % n) * Math.PI * 2 / n, j = 1 + (rnd(2, k % n) - 0.5) * 0.28;
        o.push([k ? "lineTo" : "moveTo", [Math.cos(a) * 24 * j, Math.sin(a) * 52 * j]]);
    }
    o.push(["stroke", []]);
    return o;
}

function MedalOps(): Op[]
{
    const o: Op[] = [["beginPath", []], ["arc", [0, 0, 19, 0, Math.PI * 2]], ["fillStyle", "#1b2540"], ["fill", []], ["lineWidth", 5]];
    RAINBOW.forEach((c, i) =>
    {
        o.push(["strokeStyle", RGBHex(c)], ["beginPath", []], ["arc", [0, 0, 22, i * Math.PI / 3, (i + 1.06) * Math.PI / 3]], ["stroke", []]);
    });
    o.push(["strokeStyle", "#ffffff"], ["lineWidth", 3], ["beginPath", []], ["moveTo", [-8, -9]], ["bezierCurveTo", [8, -9, -8, 9, 8, 9]], ["stroke", []]);
    return o;
}

function BladeOps(_hw: number): Op[]
{
    const o: Op[] = [["beginPath", []]], n = 18, a: number[][] = [], b: number[][] = [];
    for (let k = 0; k <= n; k++)
    {
        const u = k / n, r = 8 + 52 * u, th = u * 2.4, w = _hw * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.03)), 0.8) + 0.4;
        a.push([Math.cos(th) * (r + w), Math.sin(th) * (r + w)]);
        b.push([Math.cos(th) * (r - w), Math.sin(th) * (r - w)]);
    }
    a.forEach((p, i) => o.push([i ? "lineTo" : "moveTo", p]));
    for (let i = n; i >= 0; i--) o.push(["lineTo", b[i]]);
    o.push(["closePath", []], ["fillStyle", "#ffffff"], ["fill", []]);
    return o;
}

function BurstOps(_fill: boolean): Op[]
{
    const o: Op[] = [["beginPath", []]];
    const n = 12;
    for (let k = 0; k < n * 2; k++)
    {
        const a = k * Math.PI / n - Math.PI / 2, r = k % 2 ? 0.34 : 1;
        o.push([k ? "lineTo" : "moveTo", [Math.cos(a) * r * 56, Math.sin(a) * r * 56]]);
    }
    o.push(["closePath", []]);
    if (_fill) o.push(["fillStyle", "#ffffff"], ["fill", []]);
    else o.push(["strokeStyle", "#ffffff"], ["lineWidth", 1.4], ["stroke", []]);
    return o;
}

function BlobOps(_seed: number): Op[]
{
    const o: Op[] = [["beginPath", []]];
    const n = 9;
    for (let k = 0; k < n; k++)
    {
        const a = k * Math.PI * 2 / n + (rnd(_seed, k) - 0.5) * 0.4, r = 0.68 + 0.32 * rnd(_seed + 3, k);
        o.push([k ? "lineTo" : "moveTo", [Math.cos(a) * r, Math.sin(a) * r]]);
    }
    o.push(["closePath", []], ["fillStyle", "#ffffff"], ["fill", []]);
    return o;
}

const CINE_SHAPES: IShapeDef[] = [
    { key: "hexgrid_o", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: HexGridOps() },
    { key: "web0_o", w: 160, h: 160, cx: 80, cy: 80, scale: 1, ops: WebOps(0) },
    { key: "web1_o", w: 160, h: 160, cx: 80, cy: 80, scale: 1, ops: WebOps(1) },
    { key: "web2_o", w: 160, h: 160, cx: 80, cy: 80, scale: 1, ops: WebOps(2) },
    { key: "longcrack_o", w: 512, h: 96, cx: 256, cy: 48, scale: 1, ops: LongCrackOps() },
    { key: "jagring", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: JagOps(5, "#ffffff") },
    { key: "jagring_o", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: JagOps(1.4, "#ffffff") },
    { key: "medal", w: 64, h: 64, cx: 32, cy: 32, scale: 1, ops: MedalOps() },
    { key: "blob0", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: BlobOps(1) },
    { key: "blob1", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: BlobOps(5) },
    { key: "blob2", w: 128, h: 128, cx: 64, cy: 64, scale: 60, ops: BlobOps(9) },
    { key: "wedge_o", w: 128, h: 64, cx: 0, cy: 32, scale: 1, ops: [["fillStyle", "#ffffff"], ["beginPath", []], ["moveTo", [0, -32]], ["lineTo", [0, 32]], ["lineTo", [128, 0]], ["closePath", []], ["fill", []]] },
    { key: "spike", w: 40, h: 72, cx: 20, cy: 70, scale: 1, ops: [["fillStyle", "#ffffff"], ["beginPath", []], ["moveTo", [-14, 0]], ["quadraticCurveTo", [-6, -30, 0, -68]], ["quadraticCurveTo", [7, -30, 14, 0]], ["closePath", []], ["fill", []]] },
    { key: "spike_o", w: 40, h: 72, cx: 20, cy: 70, scale: 1, ops: [["strokeStyle", "#ffffff"], ["lineWidth", 1.6], ["beginPath", []], ["moveTo", [-14, 0]], ["quadraticCurveTo", [-6, -30, 0, -68]], ["quadraticCurveTo", [7, -30, 14, 0]], ["closePath", []], ["stroke", []]] },
    { key: "airblade", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: BladeOps(10) },
    { key: "airblade_i", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: BladeOps(4) },
    { key: "coilF_o", w: 64, h: 128, cx: 32, cy: 64, scale: 1, ops: [["strokeStyle", "#ffffff"], ["lineWidth", 4], ["beginPath", []], ["ellipse", [0, 0, 14, 58, 0, -Math.PI / 2, Math.PI / 2]], ["stroke", []]] },
    { key: "coilB_o", w: 64, h: 128, cx: 32, cy: 64, scale: 1, ops: [["strokeStyle", "#ffffff"], ["lineWidth", 4], ["beginPath", []], ["ellipse", [0, 0, 14, 58, 0, Math.PI / 2, Math.PI * 1.5]], ["stroke", []]] },
    { key: "burst12", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: BurstOps(true) },
    { key: "burst12_o", w: 128, h: 128, cx: 64, cy: 64, scale: 1, ops: BurstOps(false) },
];

CEffectMgr.OnInit(async (_canvas: CCanvas) =>
{
    const fw = _canvas.GetFrame();
    if (fw.Res().Find(kVignette) == null)
    {
        CH5Canvas.Init(256, 256);
        CH5Canvas.FillRadialGradient(128, 128, 128, 128, 0, 128, [
            { per: 0, color: "rgba(255,255,255,0)" },
            { per: 0.5, color: "rgba(255,255,255,0)" },
            { per: 0.8, color: "rgba(255,255,255,0.55)" },
            { per: 1, color: "rgba(255,255,255,1)" },
        ]);
        CH5Canvas.AddCmd([CH5Canvas.Cmd("fillRect", [0, 0, 256, 256])]);
        await CH5Canvas.Draw();
        CEffectTex.Push(fw, kVignette);
    }
    if (fw.Res().Find(kBeamProf) == null)
    {
        const stop: { per: number, color: string }[] = [];
        for (let i = 0; i <= 32; i++)
        {
            const t = Math.abs(2 * i / 32 - 1), al = t < 0.9 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (t - 0.9) / 0.1);
            stop.push({ per: i / 32, color: `rgba(255,255,255,${al.toFixed(3)})` });
        }
        CH5Canvas.Init(8, 64);
        CH5Canvas.FillLinearGradient(0, 0, 0, 64, stop);
        CH5Canvas.AddCmd([CH5Canvas.Cmd("fillRect", [0, 0, 8, 64])]);
        await CH5Canvas.Draw();
        CEffectTex.Push(fw, kBeamProf);
    }
    for (const s of CINE_SHAPES) await CEffectShape.RegisterShape(_canvas, s);
});

// 옵션: kind = "flash"(번쩍, 가산) | "tint"(화면을 색으로 덮음) | "vignette"(가장자리 어둡게), w, h, peak(최대 불투명도), pulse(vignette 깜빡임 횟수)
export class CEffectScreenFx extends CEffectSubject
{
    mPt: CPaint2D;
    mKind = "flash";
    mPeak = 0.6;
    mPulse = 0;

    protected Build(_o: IEffectOption)
    {
        this.mKind = _o.kind ?? "flash";
        const w = _o.w ?? 1800, h = _o.h ?? 1100;
        this.mPulse = _o.pulse ?? 0;
        if (this.mKind == "vignette")
        {
            this.mPt = new CPaint2D(kVignette, new CVec2(w * 1.15, h * 1.15));
            CEffectPrim.NoCut(this.mPt);
        }
        else this.mPt = CEffectPrim.Solid(w, h, this.mKind == "flash");
        CEffectPrim.Tint(this.mPt, this.mColor);
        this.mPeak = _o.peak ?? (this.mKind == "flash" ? 0.8 : this.mKind == "tint" ? 0.55 : 0.85);
        this.PushComp(this.mPt);
    }

    protected Tick(_r: number)
    {
        let a: number;
        if (this.mKind == "flash") a = this.mPeak * Math.pow(1 - _r, 2);
        else
        {
            a = this.mPeak * envelope(_r, 0.12, 0.25);
            if (this.mPulse > 0) a *= 0.6 + 0.4 * Math.sin(_r * this.mPulse * Math.PI * 2);
        }
        SetAlpha(this.mPt, Math.max(0.003, clamp(a, 0, 1)));
    }
}

// 옵션: n(개수), rx0/rx1/ry0/ry1(시작/끝 반지름), stagger(링 간 시차), travel(진행 방향 이동량), lw, rainbow, inward, 색 = color
// 가로로 긴 타원이 기본이며, 세로 타원 포탈은 ry 를 크게 준다. 방향은 rot 옵션
export class CEffectMultiRing extends CEffectSubject
{
    mRings: CEffectRing[] = [];
    mN = 4;
    mRx0 = 10; mRx1 = 80; mRy0 = 5; mRy1 = 40;
    mStag = 0.12;
    mTravel = 0;
    mLw = 2.5;
    mInward = false;

    protected Build(_o: IEffectOption)
    {
        this.mN = _o.n ?? 4;
        this.mRx0 = _o.rx0 ?? 10; this.mRx1 = _o.rx1 ?? 80;
        this.mRy0 = _o.ry0 ?? this.mRx0 * 0.5; this.mRy1 = _o.ry1 ?? this.mRx1 * 0.5;
        this.mStag = _o.stagger ?? 0.12;
        this.mTravel = _o.travel ?? 0;
        this.mLw = _o.lw ?? 2.5;
        this.mInward = !!_o.inward;
        for (let i = 0; i < this.mN; i++)
        {
            const c = _o.rainbow ? RAINBOW[i % RAINBOW.length] : (i % 2 ? WHITE : this.mColor);
            this.mRings.push(CEffectPiece.Ring(this, c, true, c));
        }
    }

    protected Tick(_r: number)
    {
        const span = Math.max(0.2, 1 - (this.mN - 1) * this.mStag);
        for (let i = 0; i < this.mN; i++)
        {
            let t = clamp((_r - i * this.mStag) / span, 0, 1);
            const a = t <= 0 ? 0 : 0.9 * Math.min(1, (1 - t) * 2.2);
            t = this.mInward ? 1 - t : t;
            const e = easeOut(t);
            this.mRings[i].Place(this.mTravel * t, 0, lerp(this.mRx0, this.mRx1, e), lerp(this.mRy0, this.mRy1, e), a, this.mLw);
        }
    }
}

// 세로로 긴 톱니 링 포탈. 진행은 vx/vy 옵션, 방향은 rot 옵션
export class CEffectPortal extends CEffectSubject
{
    mJag: CEffectSprite;
    mSeed = 0;

    protected Build(_o: IEffectOption)
    {
        this.mJag = CEffectPiece.Sprite(this, "jagring", _o.scale2 ?? 1, this.mColor, false, 0.01, WHITE, this.mColor);
        this.mSeed = _o.seed ?? 0;
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.15, 0.3);
        const wob = 1 + 0.06 * Math.sin(_now * 0.03 + this.mSeed);
        this.mJag.Place(0, 0, 0, (0.35 + 0.65 * easeOut(Math.min(1, _r * 3))) * wob, env);
    }
}

// 옵션: height(번개 길이), 색 = color
export class CEffectBolt extends CEffectSubject
{
    mMain: CEffectLine[] = [];
    mBranch: CEffectLine[][] = [];
    mFlash: CEffectSprite;
    mH = 420;
    mN = 9;

    protected Build(_o: IEffectOption)
    {
        this.mH = _o.height ?? 420;
        for (let i = 0; i < this.mN; i++) this.mMain.push(CEffectPiece.Line(this, [1, 0.9, 0.45], false, this.mColor, 70));
        for (let b = 0; b < 2; b++) this.mBranch.push(Array.from({ length: 3 }, () => CEffectPiece.Line(this, [1, 0.9, 0.45], false, this.mColor, 50)));
        this.mFlash = CEffectPiece.Sprite(this, "star8", 1, [1, 0.96, 0.7], true, 0.02, null, this.mColor);
    }

    protected Tick(_r: number, _now: number)
    {
        const step = Math.floor(_now / 50), a = clamp(_r < 0.55 ? 1 : (1 - _r) / 0.45, 0, 1) * (rnd(step, 1) > 0.18 ? 1 : 0.45);
        const pts: number[][] = [[0, -this.mH]];
        for (let i = 1; i < this.mN; i++) pts.push([(rnd(step, i) - 0.5) * 42, -this.mH + this.mH * i / this.mN]);
        pts.push([0, 0]);
        for (let i = 0; i < this.mN; i++) this.mMain[i].Place(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i == this.mN - 1 ? 6 : 4, a);
        for (let b = 0; b < 2; b++)
        {
            const s = pts[3 + b * 2], dir = b ? 1 : -1;
            let px = s[0], py = s[1];
            for (let k = 0; k < 3; k++)
            {
                const nx = px + dir * (14 + rnd(step, 20 + k + b * 5) * 18), ny = py + 24 + rnd(step, 30 + k) * 12;
                this.mBranch[b][k].Place(px, py, nx, ny, 2.2, a * 0.8);
                px = nx; py = ny;
            }
        }
        this.mFlash.Place(0, 0, _now * 0.002, 12 + 20 * a, a);
    }
}

// 옵션: radius, release(true 면 발사 직후의 확산), 색 = color
// 구체가 커지고 빛줄기가 안으로 모인다
export class CEffectOrb extends CEffectSubject
{
    mGlow: CPaint2D;
    mCore: CPaint2D;
    mRings: CEffectRing[] = [];
    mStreak: CEffectLine[] = [];
    mR = 36;
    mRelease = false;

    protected Build(_o: IEffectOption)
    {
        this.mR = _o.radius ?? 36;
        this.mRelease = !!_o.release;
        this.mGlow = this.AddGlow(this.mR * 4, this.mR * 4, this.mColor);
        this.mCore = this.AddGlow(this.mR * 1.6, this.mR * 1.6, WHITE);
        for (let i = 0; i < 2; i++) this.mRings.push(CEffectPiece.Ring(this, i ? WHITE : this.mColor, true, this.mColor));
        for (let i = 0; i < 14; i++) this.mStreak.push(CEffectPiece.Line(this, i % 2 ? WHITE : this.mColor, true, false, 40));
    }

    protected Tick(_r: number, _now: number)
    {
        const R = this.mR, env = this.mRelease ? 1 - _r : envelope(_r, 0.7, 0.3);
        const grow = this.mRelease ? 1 + _r * 0.6 : 0.25 + 0.75 * easeOut(Math.min(1, _r / 0.8));
        const pulse = 1 + 0.08 * Math.sin(_now * 0.03);
        const g = R * grow * pulse;
        SetGlow(this.mGlow, 0, 0, 0, 0.9 * env, 4 * g);
        SetGlow(this.mCore, 0, 0, 0.01, env, 1.6 * g);
        for (let i = 0; i < 2; i++)
        {
            const t = this.mRelease ? _r : (i ? (_r * 1.6) % 1 : _r);
            const rr = this.mRelease ? R * (1 + t * 3) : R * (3.2 - 2.2 * t * (1 + i * 0.5)) * grow;
            this.mRings[i].Place(0, 0, Math.max(2, rr), Math.max(2, rr), 0.8 * env * (this.mRelease ? 1 - t : 0.4 + 0.6 * t), 2);
        }
        for (let i = 0; i < this.mStreak.length; i++)
        {
            const ang = i * Math.PI * 2 / this.mStreak.length + (rnd(1, i) - 0.5) * 0.3 + _now * 0.0006;
            const ph = (_r * 2.2 + rnd(2, i)) % 1;
            const d0 = this.mRelease ? R * (1 + ph * 5) : R * (5 - 4 * ph), d1 = d0 + (this.mRelease ? R * 1.6 : R * 1.4);
            const a = this.mRelease ? (1 - ph) * env : Math.sin(ph * Math.PI) * env;
            this.mStreak[i].Place(Math.cos(ang) * d0, Math.sin(ang) * d0, Math.cos(ang) * d1, Math.sin(ang) * d1, 2.4, a * 0.9);
        }
    }
}

// 옵션: size(월드 크기, 기본 90), rot, 색 = color
export class CEffectHex extends CEffectSubject
{
    mSpr: CEffectSprite;
    mPx = 90;

    protected Build(_o: IEffectOption)
    {
        this.mPx = _o.size ?? 90;
        this.mSpr = CEffectPiece.Sprite(this, "hexgrid_o", 1, this.mColor, true, 0.01, null, null);
    }

    protected Tick(_r: number)
    {
        const k = this.mPx / 128;
        this.mSpr.Place(0, 0, 0.3 * _r, k * (0.7 + 0.3 * easeOut(Math.min(1, _r * 3))), envelope(_r, 0.08, 0.5));
    }
}

// 바닥에 오래 남는 균열. 옵션: kind = "web"(거미줄) | "long"(길게 뻗는 금), variant(0~2), size
export class CEffectCrack extends CEffectSubject
{
    mSpr: CEffectSprite;

    protected Build(_o: IEffectOption)
    {
        const long = _o.kind == "long";
        this.mSpr = CEffectPiece.Sprite(this, long ? "longcrack_o" : "web" + ((_o.variant ?? 0) % 3) + "_o", 1, _o.color ?? [0.03, 0.05, 0.08], false, 0.001, null, null);
        this.mSpr.Place(0, 0, long ? (_o.rot2 ?? 0) : (_o.seed ?? 0) * 2.1, (_o.size ?? 60) / (long ? 512 : 160), 0);
        this.mK = (_o.size ?? 60) / (long ? 512 : 160);
        this.mAng = long ? (_o.rot2 ?? 0) : (_o.seed ?? 0) * 2.1;
    }

    mK = 1;
    mAng = 0;

    protected Tick(_r: number)
    {
        const a = 0.85 * Math.min(1, (this.mLife * (1 - _r)) / 2) * Math.min(1, _r * this.mLife / 0.12);
        this.mSpr.Place(0, 0, this.mAng, this.mK * (0.85 + 0.15 * Math.min(1, _r * this.mLife / 0.12)), a);
    }
}

// 옵션: w, h(영역), n(입자 수), vx, vy(바람), size, 색 = color. life 가 곧 지속 시간
export class CEffectAmbient extends CEffectSubject
{
    mDots: CEffectSprite[] = [];
    mW = 900; mH = 520; mWx = -14; mWy = 4;

    protected Build(_o: IEffectOption)
    {
        this.mW = _o.w ?? 900; this.mH = _o.h ?? 520;
        this.mWx = _o.vx2 ?? -14; this.mWy = _o.vy2 ?? 4;
        const n = _o.n ?? 36;
        for (let i = 0; i < n; i++) this.mDots.push(CEffectPiece.Sprite(this, "dot", 1, this.mColor, false, 0.02, null, null));
    }

    protected Tick(_r: number, _now: number)
    {
        const t = _r * this.mLife, fade = envelope(_r, 0.04, 0.06);
        for (let i = 0; i < this.mDots.length; i++)
        {
            const sp = 0.5 + rnd(1, i) * 1.2;
            const x = ((rnd(2, i) * this.mW + this.mWx * sp * t) % this.mW + this.mW) % this.mW - this.mW / 2;
            const y = ((rnd(3, i) * this.mH + this.mWy * sp * t) % this.mH + this.mH) % this.mH - this.mH / 2;
            const tw = 0.45 + 0.55 * Math.sin(_now * 0.002 * (0.6 + rnd(4, i)) + i);
            this.mDots[i].Place(x, y, 0, 0.5 + rnd(5, i) * 1.1, 0.5 * tw * fade);
        }
    }
}

const sPos = new CVec3();
const sRot = new CVec3();

// 선분 하나. 소프트바(가우시안 번짐) 또는 단색 사각형을 가산으로 그린다. 좌표는 캔버스 기준(y 아래가 +)
export class CEffectSeg extends CSubject
{
    mPt: CPaint2D;
    mA = -1;

    mZ = 0;

    constructor(_kind: number)
    {
        super();
        this.mZ = _kind == 1 ? 0.002 : _kind >= 7 ? 0.012 * (_kind - 6) : 0.001 * _kind;
        this.mPt = _kind >= 7 ? CEffectPrim.NoCut(new CPaint2D(kBeamProf, new CVec2(2, 2))) : _kind == 0 ? CEffectPrim.SoftBar(2, 2) : CEffectPrim.Solid(2, 2, _kind == 1);
        this.PushComp(this.mPt);
    }

    Config(_c: TRGB)
    {
        SetTint(this.mPt, _c);
        this.mA = -1;
    }

    Place(_ax: number, _ay: number, _bx: number, _by: number, _w: number, _a: number)
    {
        const dx = _bx - _ax, dy = -(_by - _ay);
        sPos.mF32A[0] = (_ax + _bx) / 2; sPos.mF32A[1] = -(_ay + _by) / 2; sPos.mF32A[2] = this.mZ;
        this.SetPos(sPos);
        sRot.mF32A[2] = Math.atan2(dy, dx);
        this.SetRot(sRot);
        SetSize(this.mPt, Math.max(1, Math.hypot(dx, dy)), Math.max(1, _w));
        const q = QuantAlpha(_a, 40);
        if (q != this.mA) { this.mA = q; SetAlpha(this.mPt, q); }
    }
}

export function TakeSeg(_parent: CSubject, _kind: number, _c: TRGB): CEffectSeg
{
    const s = Take("fxSeg|" + _kind, () => new CEffectSeg(_kind));
    s.Config(_c);
    _parent.PushChild(s);
    return s;
}

// 시작이 넓고 끝이 뾰족한 쐐기. 기준점(넓은 쪽)에서 각도 방향으로 뻗는다
class CEffectWedge extends CSubject
{
    mPt: CPaint2D;
    mA = -1;

    constructor()
    {
        super();
        this.mPt = new CPaint2D(CEffectShape.Key("wedge_o"), new CVec2(2, 2));
        CEffectPrim.NoCut(this.mPt);
        this.PushComp(this.mPt);
    }

    Config(_c: TRGB)
    {
        SetTint(this.mPt, _c);
        this.mA = -1;
    }

    Place(_ang: number, _r0: number, _len: number, _w: number, _a: number)
    {
        sRot.mF32A[2] = _ang;
        this.SetRot(sRot);
        const v = this.mPt.GetPos();
        v.mF32A[0] = _r0 + _len / 2; v.mF32A[1] = 0; v.mF32A[2] = 0;
        this.mPt.SetPos(v);
        SetSize(this.mPt, Math.max(1, _len), Math.max(1, _w));
        const q = QuantAlpha(_a, 20);
        if (q != this.mA) { this.mA = q; SetAlpha(this.mPt, q); }
    }
}

function TakeWedge(_parent: CSubject, _c: TRGB): CEffectWedge
{
    const s = Take("fxWedge", () => new CEffectWedge());
    s.Config(_c);
    _parent.PushChild(s);
    return s;
}

// 옵션: w, h(영역), n(쐐기 수), mode = "black"(기본) | "white", silhouette(중앙 실루엣 덩어리), seed
// 만화식 컷인. 배경을 덮고 쐐기 모양 속도선이 방사로 퍼진다
export class CEffectCutin extends CEffectSubject
{
    mBg: CPaint2D;
    mWedges: CEffectWedge[] = [];
    mBlobs: CEffectDisc[] = [];
    mN = 34;
    mSeed = 1;
    mInner = 70;

    protected Build(_o: IEffectOption)
    {
        const w = _o.w ?? 1500, h = _o.h ?? 860, white = _o.mode == "white";
        this.mSeed = _o.seed ?? 1;
        this.mInner = _o.inner ?? 70;
        this.mN = _o.n ?? 34;
        this.mBg = CEffectPrim.Solid(w, h, false);
        CEffectPrim.Tint(this.mBg, white ? [0.97, 0.95, 0.9] : [0.02, 0.02, 0.05]);
        SetPos(this.mBg, 0, 0, -0.01);
        this.PushComp(this.mBg);
        const lc: TRGB = white ? [0.04, 0.04, 0.07] : WHITE;
        for (let i = 0; i < this.mN; i++) this.mWedges.push(TakeWedge(this, lc));
        if (_o.silhouette)
        {
            for (const p of [[0, 0, 70, 58]])
            {
                const d = CEffectPiece.Disc(this, false, lc, false, null, 1.5, 0.002);
                d.Place(p[0], p[1], p[2], p[3], 0, 1);
                this.mBlobs.push(d);
            }
        }
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.08, 0.22);
        SetAlpha(this.mBg, clamp(env, 0, 1));
        const step = Math.floor(_now / 66);
        for (let i = 0; i < this.mN; i++)
        {
            const ang = i * Math.PI * 2 / this.mN + (rnd(this.mSeed + step, i) - 0.5) * 0.08;
            const r0 = this.mInner + rnd(this.mSeed, i) * 60;
            const len = 380 + rnd(this.mSeed + 3, i + step) * 640;
            const w = 4 + Math.pow(rnd(this.mSeed + 5, i), 2.6) * 34;
            this.mWedges[i].Place(ang, r0 * (0.7 + 0.3 * env), len, w, env);
        }
        const p0 = [[0, 0, 70, 58]];
        const k = 1 + 0.1 * Math.sin(_r * 9);
        for (let i = 0; i < this.mBlobs.length; i++) this.mBlobs[i].Place(p0[i][0], p0[i][1], p0[i][2] * k, p0[i][3] * k, 0, env);
    }
}

// 옵션: dx, dy(끝점 오프셋, 캔버스 기준 y 아래가 +), arc(솟는 높이)
// 트레이너 손에서 높게 솟았다가 몬스터로 내려꽂히는 무지개 6가닥과 흰 번개
export class CEffectRainbow extends CEffectSubject
{
    static kSeg = 14;
    mSoft: CEffectSeg[][] = [];
    mStr: CEffectSeg[][] = [];
    mZig: CEffectSeg[] = [];
    mGlowA: CPaint2D;
    mGlowB: CPaint2D;
    mStars: CEffectSprite[] = [];
    mDx = 200; mDy = -60; mArc = 70;
    mN = 6;

    protected Build(_o: IEffectOption)
    {
        this.mDx = _o.dx ?? 200; this.mDy = _o.dy ?? -60;
        this.mArc = _o.arc ?? 55;
        for (let k = 0; k < this.mN; k++)
            this.mSoft.push(Array.from({ length: CEffectRainbow.kSeg }, () => TakeSeg(this, 0, RAINBOW[k])));
        for (let k = 0; k < this.mN; k++)
            this.mStr.push(Array.from({ length: CEffectRainbow.kSeg }, () => TakeSeg(this, 2, RAINBOW[k])));
        for (let i = 0; i < 6; i++) this.mZig.push(TakeSeg(this, 1, WHITE));
        this.mGlowA = this.AddGlow(60, 60, WHITE);
        this.mGlowB = this.AddGlow(60, 60, WHITE);
        for (let i = 0; i < 8; i++) this.mStars.push(CEffectPiece.Sprite(this, "star4", 1, WHITE, true, 0.02, null, null));
    }

    private Pt(_t: number, _k: number, _now: number, _out: number[])
    {
        const hk = this.mArc * (0.45 + 0.95 * _k / (this.mN - 1)), lat = (_k - (this.mN - 1) / 2) * 5;
        const x0 = 0, y0 = 0, x1 = this.mDx * 0.04 + lat, y1 = -hk, x2 = this.mDx * 0.9 + lat, y2 = this.mDy - hk * 0.8, x3 = this.mDx, y3 = this.mDy;
        const u = 1 - _t, a = u * u * u, b = 3 * u * u * _t, c = 3 * u * _t * _t, d = _t * _t * _t;
        const w = Math.sin(_t * Math.PI) * 1.8 * Math.sin(_now * 0.012 + _k + _t * 7);
        _out[0] = a * x0 + b * x1 + c * x2 + d * x3;
        _out[1] = a * y0 + b * y1 + c * y2 + d * y3 + w;
    }

    protected Tick(_r: number, _now: number)
    {
        const head = clamp((_r - 0.02) / 0.3, 0, 1), tail = clamp((_r - 0.66) / 0.3, 0, 1), a = clamp(envelope(_r, 0.02, 0.25), 0, 1);
        const S = CEffectRainbow.kSeg, p0 = [0, 0], p1 = [0, 0];
        for (let k = 0; k < this.mN; k++)
            for (let s = 0; s < S; s++)
            {
                const t0 = tail + (head - tail) * s / S, t1 = tail + (head - tail) * (s + 1) / S;
                this.Pt(t0, k, _now, p0);
                this.Pt(t1, k, _now, p1);
                this.mSoft[k][s].Place(p0[0], p0[1], p1[0], p1[1], 9, head > tail ? 0.35 * a : 0);
                this.mStr[k][s].Place(p0[0], p0[1], p1[0], p1[1], 2.2, head > tail ? a : 0);
            }
        const step = Math.floor(_now / 55), Z = this.mZig.length;
        let px = 0, py = 0;
        for (let i = 0; i < Z; i++)
        {
            const t = head * (i + 1) / Z, amp = i == Z - 1 ? 0 : 13 * (rnd(step, i) - 0.5) * 2;
            const L = Math.hypot(this.mDx, this.mDy) || 1;
            const nx = -this.mDy / L, ny = this.mDx / L;
            const x = this.mDx * t + nx * amp, y = this.mDy * t + ny * amp;
            this.mZig[i].Place(px, py, x, y, 2.4, a * (head > 0.5 ? 1 : 0) * (1 - tail));
            px = x; py = y;
        }
        SetGlow(this.mGlowA, 0, 0, 0.01, a * 0.9);
        SetGlow(this.mGlowB, this.mDx, -this.mDy, 0.01, a * clamp((head - 0.8) * 5, 0, 1));
        for (let i = 0; i < this.mStars.length; i++)
        {
            const t = clamp(tail + (head - tail) * ((i + 0.5) / this.mStars.length), 0, 1);
            this.Pt(t, i % this.mN, _now, p0);
            const tw = 0.5 + 0.5 * Math.sin(_now * 0.02 + i * 2.1);
            this.mStars[i].Place(p0[0], -p0[1], _now * 0.004 + i, 1.5 + 4 * tw, a * tw);
        }
    }
}

const kBeamProf = "fx/beamprof.tex";

// 옵션: radius, 색 = color. 몬스터를 감싸는 반투명 구와 무지개 테두리, 점점 모이는 흰 링과 반짝임
export class CEffectBubble extends CEffectSubject
{
    mFill: CPaint2D;
    mRings: CEffectRing[] = [];
    mOuter: CEffectRing;
    mSpark: CEffectSprite[] = [];
    mR = 34;

    protected Build(_o: IEffectOption)
    {
        this.mR = _o.radius ?? 34;
        this.mFill = this.AddGlow(this.mR * 2.6, this.mR * 2.6, [0.62, 0.86, 1]);
        for (let k = 0; k < 6; k++) this.mRings.push(CEffectPiece.Ring(this, RAINBOW[k], false, RAINBOW[k]));
        this.mOuter = CEffectPiece.Ring(this, WHITE, false, WHITE);
        for (let i = 0; i < 8; i++) this.mSpark.push(CEffectPiece.Sprite(this, "dot", 1, WHITE, true, 0.02, null, null));
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.12, 0.3), R = this.mR;
        SetGlow(this.mFill, 0, 0, 0, 0.28 * env);
        for (let k = 0; k < 6; k++)
        {
            const rr = R * (1 + 0.035 * Math.sin(_now * 0.006 + k * 1.1)) + (k - 2.5) * 1.5;
            this.mRings[k].Place(0, 0, rr, rr * 0.92, 0.85 * env, 1.5);
        }
        const o = R * (1.7 - 0.7 * easeOut(Math.min(1, _r * 3.5)));
        this.mOuter.Place(0, 0, o, o * 0.92, 0.9 * env * (1 - clamp((_r - 0.3) * 3, 0, 1)), 1.8);
        for (let i = 0; i < this.mSpark.length; i++)
        {
            const ang = _now * 0.003 * (i % 2 ? 1 : -1) + i * 0.8, rr = R * (1.0 + 0.3 * Math.sin(_now * 0.004 + i));
            const tw = 0.4 + 0.6 * Math.sin(_now * 0.012 + i * 1.7);
            this.mSpark[i].Place(Math.cos(ang) * rr, Math.sin(ang) * rr, 0, 0.7 + tw, env * Math.max(0, tw));
        }
    }
}

// 옵션: size, 색 = color. 상성 유효 타격의 별 폭발: 뾰족한 12각 별 + 흰 중심 + 겹친 링
export class CEffectStarburst extends CEffectSubject
{
    mStar: CEffectSprite;
    mCore: CPaint2D;
    mRings: CEffectRing[] = [];
    mPx = 60;

    protected Build(_o: IEffectOption)
    {
        this.mPx = _o.size ?? 60;
        this.mStar = CEffectPiece.Sprite(this, "burst12", 1, this.mColor, false, 0.01, null, this.mColor);
        this.mCore = this.AddGlow(this.mPx * 0.55, this.mPx * 0.55, WHITE);
        this.mRings.push(CEffectPiece.Ring(this, WHITE, false, null), CEffectPiece.Ring(this, this.mColor, false, null));
    }

    protected Tick(_r: number)
    {
        const env = envelope(_r, 0.04, 0.5), s = this.mPx / 112 * (0.45 + 0.75 * easeOut(Math.min(1, _r * 4)));
        this.mStar.Place(0, 0, _r * 1.4, s, env);
        SetGlow(this.mCore, 0, 0, 0, env);
        const r1 = this.mPx * 0.5 * (0.4 + 1.2 * easeOut(Math.min(1, _r * 2.4)));
        this.mRings[0].Place(0, 0, r1, r1, 0.9 * env, 1.8);
        this.mRings[1].Place(0, 0, r1 * 1.25, r1 * 1.25, 0.7 * env, 1.2);
    }
}

// 옵션: radius, 색 = color. 오라구체: 광택이 있는 푸른 구와 번짐
export class CEffectAuraBall extends CEffectSubject
{
    mTrail: CEffectWedge[] = [];
    mBall: CEffectDisc;
    mRim: CEffectDisc;
    mHi: CEffectDisc;
    mGlow: CPaint2D;
    mR = 14;

    protected Build(_o: IEffectOption)
    {
        this.mR = _o.radius ?? 14;
        this.mTrail.push(TakeWedge(this, this.mColor), TakeWedge(this, [0.85, 0.96, 1]));
        this.mGlow = this.AddGlow(this.mR * 4.4, this.mR * 4.4, this.mColor);
        const bc: TRGB = [this.mColor[0] * 0.6 + 0.4, this.mColor[1] * 0.6 + 0.4, this.mColor[2] * 0.6 + 0.4];
        this.mBall = CEffectPiece.Disc(this, false, bc, false, this.mColor, 1.5, 0.01);
        this.mRim = CEffectPiece.Disc(this, true, [0.85, 0.96, 1], true, this.mColor, 1.6, 0.012);
        this.mHi = CEffectPiece.Disc(this, false, WHITE, false, null, 1.5, 0.014);
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.08, 0.2), R = this.mR * (1 + 0.05 * Math.sin(_now * 0.02));
        this.mTrail[0].Place(Math.PI, 0, this.mR * 3.4, this.mR * 1.5, 0.85 * env);
        this.mTrail[1].Place(Math.PI, 0, this.mR * 2.2, this.mR * 0.8, env);
        this.mBall.Place(0, 0, R, R, 0, env);
        this.mRim.Place(0, 0, R * 1.02, R * 1.02, 0, 0.9 * env);
        this.mHi.Place(-R * 0.3, -R * 0.35, R * 0.35, R * 0.28, 0.6, 0.9 * env);
        SetGlow(this.mGlow, 0, 0, 0, 0.8 * env);
    }
}

// 옵션: text, color(글자 색), stroke(외곽선 색), bg(띠 색), w, h(띠 크기), size(글자 높이)
// style = "band"(가로 띠) | "ghost"(띠 없이 크고 옅은 글자) | "combo"(노란 굵은 글자가 튀어나옴) | "ko"(큰 붉은 글자) | "ribbon"(붉은 띠, 글자는 오른쪽)
export class CEffectBanner extends CEffectSubject
{
    mBand: CPaint2D = null;
    mEdge: CPaint2D[] = [];
    mText: CPaint2D;
    mStyle = "band";
    mW = 1400;
    mTw = 1;
    mTh = 1;
    mOff = 0;

    protected Build(_o: IEffectOption)
    {
        this.mStyle = _o.style ?? (_o.ghost ? "ghost" : "band");
        this.mW = _o.w ?? 1400;
        const st = this.mStyle, h = _o.h ?? 74;
        const size = _o.size ?? (st == "ghost" ? 120 : st == "combo" ? 56 : st == "ko" ? 96 : 46);
        let fill = RGBHex(this.mColor), stroke = _o.stroke ?? "#081323", sw = 12;
        if (st == "combo") { fill = _o.fill ?? "#ffe14a"; stroke = _o.stroke ?? "#2a1a05"; sw = 16; }
        if (st == "ko") { fill = _o.fill ?? "#ff4a2e"; stroke = _o.stroke ?? "#2a0a0a"; sw = 18; }
        if (st == "ribbon") { fill = "#ffffff"; stroke = "#3a0a05"; sw = 10; this.mOff = this.mW * 0.3; }
        if (st == "band" || st == "ribbon")
        {
            this.mBand = CEffectPrim.Solid(this.mW, h, false);
            CEffectPrim.Tint(this.mBand, _o.bg ?? (st == "ribbon" ? [0.92, 0.22, 0.12] : [0.05, 0.07, 0.12]));
            SetPos(this.mBand, 0, 0, -0.01);
            this.PushComp(this.mBand);
            for (const s of [-1, 1])
            {
                const e = CEffectPrim.Solid(this.mW, 3, true);
                CEffectPrim.Tint(e, st == "ribbon" ? WHITE : this.mColor);
                SetPos(e, 0, s * (h / 2 - 1.5));
                this.PushComp(e);
                this.mEdge.push(e);
            }
        }
        const t = CEffectText.Get(String(_o.text ?? ""), fill, stroke, sw), k = size / CEffectText.kPx;
        this.mTw = t.w * k; this.mTh = t.h * k;
        this.mText = new CPaint2D(t.key, new CVec2(this.mTw, this.mTh));
        SetPos(this.mText, 0, 0, 0.01);
        this.PushComp(this.mText);
    }

    protected Tick(_r: number)
    {
        const st = this.mStyle;
        if (st == "combo" || st == "ko")
        {
            const pop = 1 + (st == "ko" ? 0.6 : 0.4) * Math.pow(Math.max(0, 1 - _r * 7), 2), env = envelope(_r, 0.03, 0.25);
            SetSize(this.mText, this.mTw * pop, this.mTh * pop);
            SetPos(this.mText, 0, 12 * _r, 0.01);
            SetAlpha(this.mText, Math.max(0.02, env));
            return;
        }
        const slideIn = easeOut(clamp(_r / 0.16, 0, 1)), slideOut = clamp((_r - 0.84) / 0.16, 0, 1);
        const x = st == "ghost" ? lerp(-60, 60, _r) : lerp(-this.mW, 0, slideIn) + lerp(0, this.mW, slideOut * slideOut);
        if (this.mBand)
        {
            SetPos(this.mBand, x, 0, -0.01);
            SetAlpha(this.mBand, 0.92);
            for (const e of this.mEdge) SetPos(e, x, e.GetPos().y);
        }
        SetPos(this.mText, st == "ghost" ? x : x * 0.6 + this.mOff, 0, 0.01);
        SetAlpha(this.mText, st == "ghost" ? 0.3 * envelope(_r, 0.2, 0.3) : Math.max(0.02, slideOut > 0 ? 1 - slideOut : slideIn));
    }
}

// 머리 위로 떠올라 도는 무지개 메달(메가진화 표시). 옵션: rise(떠오르는 높이)
export class CEffectMedal extends CEffectSubject
{
    mSpr: CEffectSprite;
    mGlow: CPaint2D;
    mRise = 46;

    protected Build(_o: IEffectOption)
    {
        this.mRise = _o.rise ?? 46;
        this.mGlow = this.AddGlow(40, 40, [0.8, 0.9, 1]);
        this.mSpr = CEffectPiece.Sprite(this, "medal", 1, null, false, 0.01, null, null);
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.15, 0.3), y = this.mRise * easeOut(Math.min(1, _r * 2.5));
        this.mSpr.Place(0, y, 0, 0.6 + 0.5 * easeOut(Math.min(1, _r * 3)) + 0.05 * Math.sin(_now * 0.01), env);
        SetGlow(this.mGlow, 0, y, 0, 0.3 * env);
    }
}

CEffectMgr.Register("medal", () => new CEffectMedal(), 1.4);
CEffectMgr.Register("cutin", () => new CEffectCutin(), 0.75);
CEffectMgr.Register("screenfx", () => new CEffectScreenFx(), 0.5);
CEffectMgr.Register("multiRing", () => new CEffectMultiRing(), 0.8);
CEffectMgr.Register("portal", () => new CEffectPortal(), 0.9);
CEffectMgr.Register("rainbow", () => new CEffectRainbow(), 1.1);
CEffectMgr.Register("bolt", () => new CEffectBolt(), 0.45);
CEffectMgr.Register("orb", () => new CEffectOrb(), 1);
CEffectMgr.Register("hex", () => new CEffectHex(), 0.7);
CEffectMgr.Register("crack", () => new CEffectCrack(), 20);
CEffectMgr.Register("banner", () => new CEffectBanner(), 1.8);
CEffectMgr.Register("ambient", () => new CEffectAmbient(), 30);
CEffectMgr.Register("bubble", () => new CEffectBubble(), 1.6);
CEffectMgr.Register("starburst", () => new CEffectStarburst(), 0.6);
CEffectMgr.Register("auraBall", () => new CEffectAuraBall(), 1);

// 옵션: size, 색 = color. 몬스터 발밑에서 타오르는 푸른 결정 불꽃(메가리자몽X 플레어 드라이브)
export class CEffectBlueFlame extends CEffectSubject
{
    mSp: CEffectSprite[] = [];
    mPx = 30;

    protected Build(_o: IEffectOption)
    {
        this.mPx = _o.size ?? 30;
        for (let i = 0; i < 9; i++) this.mSp.push(CEffectPiece.Sprite(this, "spike", 1, this.mColor, false, 0.01 + i * 0.0001, [0.8, 0.97, 1], this.mColor));
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.1, 0.3), k = this.mPx / 70;
        for (let i = 0; i < this.mSp.length; i++)
        {
            const f = 0.6 + 0.4 * Math.sin(_now * 0.018 + i * 2.3), side = (i - 4) / 4;
            const h = (0.55 + 0.6 * (1 - Math.abs(side)) * f) * k;
            this.mSp[i].Place(side * this.mPx * 0.8, -4 * Math.abs(side), side * 0.32, h * (1 + 0.15 * Math.sin(_r * 6)), 0.9 * env);
        }
    }
}

CEffectMgr.Register("blueFlame", () => new CEffectBlueFlame(), 1);

// 옵션: size(둘레 반지름), 색 = color(리본 한 가닥), color2(다른 가닥)
// 몬스터를 나선으로 감싸 올라가는 두 가닥 리본(용의춤)과 바닥의 가는 타원 링
export class CEffectRibbonWrap extends CEffectSubject
{
    static kSeg = 16;
    mRib: CEffectSeg[][] = [];
    mRing: CEffectRing;
    mR = 22;

    protected Build(_o: IEffectOption)
    {
        this.mR = _o.size ?? 22;
        const c2: TRGB = _o.color2 ?? [0.55, 0.3, 0.95];
        for (const c of [this.mColor, c2]) this.mRib.push(Array.from({ length: CEffectRibbonWrap.kSeg }, () => TakeSeg(this, 2, c)));
        this.mRing = CEffectPiece.Ring(this, c2, false, null);
    }

    private Pt(_t: number, _k: number, _spin: number, _out: number[])
    {
        const a = _spin + _t * Math.PI * 3.2 + _k * Math.PI;
        _out[0] = Math.cos(a) * this.mR * (0.75 + 0.35 * _t);
        _out[1] = -(_t * this.mR * 1.9 - this.mR * 0.4) + Math.sin(a) * this.mR * 0.35;
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.12, 0.3), S = CEffectRibbonWrap.kSeg, p0 = [0, 0], p1 = [0, 0], spin = _r * 6;
        const head = clamp(_r / 0.35, 0, 1), tail = clamp((_r - 0.55) / 0.4, 0, 1);
        for (let k = 0; k < 2; k++)
            for (let s = 0; s < S; s++)
            {
                const t0 = tail + (head - tail) * s / S, t1 = tail + (head - tail) * (s + 1) / S;
                this.Pt(t0, k, spin, p0);
                this.Pt(t1, k, spin, p1);
                this.mRib[k][s].Place(p0[0], p0[1], p1[0], p1[1], 3.4, head > tail ? env : 0);
            }
        const rr = this.mR * (1.2 + 0.3 * Math.sin(_r * 5));
        this.mRing.Place(0, this.mR * 0.4, rr, rr * 0.38, 0.8 * env, 1.4);
    }
}

CEffectMgr.Register("ribbonWrap", () => new CEffectRibbonWrap(), 1);

// 옵션: size(최대 크기), drift(올라가는 거리), 색 = color. 빔이 부딪히는 곳에서 피어오르는 흰 수증기 한 덩이
export class CEffectSteam extends CEffectSubject
{
    mPt: CPaint2D;
    mPx = 50;
    mDrift = 34;
    mSide = 0;

    protected Build(_o: IEffectOption)
    {
        this.mPx = _o.size ?? 50;
        this.mDrift = _o.drift ?? 34;
        this.mSide = (Math.random() - 0.5) * 30;
        this.mPt = CEffectPrim.Glow(this.mPx, this.mPx, this.mColor, 0, false);
        this.PushComp(this.mPt);
    }

    protected Tick(_r: number)
    {
        const s = this.mPx * 2.4 * (0.35 + 0.65 * easeOut(_r));
        SetSize(this.mPt, s, s);
        SetPos(this.mPt, this.mSide * _r, this.mDrift * easeOut(_r));
        SetAlpha(this.mPt, Math.max(0.01, 0.6 * Math.min(1, _r * 6) * (1 - _r)));
    }
}

CEffectMgr.Register("steam", () => new CEffectSteam(), 1);


// 줄기 색: out(테두리), cold(끝쪽 몸통), hot(입쪽 몸통), hi(가장 뜨거운 속), glow(번짐)
export interface IFlamePalette { out: TRGB, cold: TRGB, hot: TRGB, hi: TRGB, glow: TRGB }

export const FLAME_PALETTES: Record<string, IFlamePalette> = {
    fire: { out: [0.72, 0.18, 0.05], cold: [1, 0.56, 0.1], hot: [1, 0.94, 0.35], hi: [1, 0.93, 0.5], glow: [1, 0.55, 0.15] },
    blue: { out: [0.05, 0.15, 0.6], cold: [0.15, 0.45, 1], hot: [0.7, 0.92, 1], hi: [0.9, 0.97, 1], glow: [0.3, 0.6, 1] },
    toxic: { out: [0.25, 0.05, 0.35], cold: [0.6, 0.2, 0.8], hot: [0.9, 0.6, 1], hi: [1, 0.85, 1], glow: [0.7, 0.3, 0.9] },
    dragon: { out: [0.2, 0.1, 0.5], cold: [0.45, 0.3, 0.95], hot: [0.8, 0.75, 1], hi: [0.95, 0.92, 1], glow: [0.55, 0.4, 1] },
    frost: { out: [0.2, 0.45, 0.75], cold: [0.55, 0.85, 1], hot: [0.95, 1, 1], hi: [1, 1, 1], glow: [0.5, 0.8, 1] },
    leaf: { out: [0.08, 0.3, 0.08], cold: [0.3, 0.75, 0.2], hot: [0.85, 1, 0.5], hi: [1, 1, 0.8], glow: [0.4, 0.9, 0.3] },
};

// 옵션: preset(색 종류), palette(색 일부 덮어쓰기), track, len(길이). 추적 모드는 빔과 같은 SetReach/Stop 규칙을 쓴다
// 화염방사: 입에서 작은 덩어리가 나와 퍼지며 커지는, 각진 덩어리가 겹친 줄기
export class CEffectFlameStream extends CEffectSustain
{
    static kN = 34;
    mPreset: string;
    mPal: IFlamePalette = FLAME_PALETTES.fire;
    mOut: CEffectSprite[] = [];
    mFill: CEffectSprite[] = [];
    mHot: CEffectSprite[] = [];
    mGlow: CPaint2D;
    mBlooms: CPaint2D[] = [];

    constructor(_preset = "fire")
    {
        super();
        this.mPreset = _preset;
    }

    protected Build(_o: IEffectOption)
    {
        this.BeginSustain(_o, 300);
        const pal = this.mPal = PickStyle(FLAME_PALETTES, _o.preset ?? this.mPreset, "fire", _o.palette ?? {}, ["out", "cold", "hot", "hi", "glow"]);
        const N = CEffectFlameStream.kN;
        for (let i = 0; i < N; i++)
        {
            const key = "blob" + (i % 3), z = 0.001 * (N - i);
            this.mOut.push(CEffectPiece.Sprite(this, key, 1, pal.out, false, z, null, null));
            this.mFill.push(CEffectPiece.Sprite(this, key, 1, pal.cold, false, z + 0.0003, null, pal.glow, true));
            this.mHot.push(CEffectPiece.Sprite(this, "blob" + ((i + 1) % 3), 1, pal.hi, false, z + 0.0006, null, null));
        }
        this.mGlow = this.AddGlow(70, 70, pal.glow);
        for (let i = 0; i < 6; i++) this.mBlooms.push(this.AddGlow(100, 100, Mix(pal.glow, pal.hot, i / 12)));
    }

    protected Tick(_r: number, _now: number)
    {
        const clock = this.Clock(_now), fade = this.Fade(_now, 260);
        if (this.mStop && fade <= 0) { this.Destroy(); return; }
        const N = CEffectFlameStream.kN, reach = this.mReach * Math.min(1, clock / 0.25 + 0.15);
        for (let i = 0; i < N; i++)
        {
            const cyc = clock * 1.8 + i / N, phase = cyc % 1, id = Math.floor(cyc) * 31 + i;
            const size = (4 + 24 * Math.pow(phase, 0.85)) * (0.75 + 0.5 * rnd(3, id));
            const lat = (rnd(7, id) - 0.5) * 2 * (3 + 30 * phase) + Math.sin(clock * 8 + i) * size * 0.12;
            const x = phase * reach + (rnd(5, id) - 0.5) * 8 * phase;
            const a = fade * (phase < 0.08 ? phase / 0.08 : phase > 0.9 ? (1 - phase) / 0.1 : 1);
            const hot = 1 - clamp(phase * 1.7, 0, 1), rot = rnd(13, id) * 6.28 + clock * (rnd(17, id) - 0.5) * 2;
            SetTint(this.mFill[i].mPt, Mix(this.mPal.cold, this.mPal.hot, hot));
            this.mOut[i].Place(x, lat, rot, size * 1.0, a);
            this.mFill[i].Place(x, lat, rot, size * 0.92, a);
            this.mHot[i].Place(x - size * 0.2, lat - size * 0.22, rot + 1, size * 0.62, a * (0.7 + 0.3 * hot));
        }
        SetGlow(this.mGlow, 0, 0, 0.002, 0.8 * fade);
        for (let i = 0; i < this.mBlooms.length; i++)
        {
            const u = (i + 0.5) / this.mBlooms.length;
            SetGlow(this.mBlooms[i], u * reach, 0, 0.0005, (0.35 + 0.1 * Math.sin(_now * 0.02 + i)) * fade * Math.min(1, clock * 6), 70 + 90 * u);
        }
    }
}

CEffectMgr.Register("flameStream", () => new CEffectFlameStream("fire"), 1);
CEffectMgr.Register("blueFlameStream", () => new CEffectFlameStream("blue"), 1);
CEffectMgr.Register("poisonStream", () => new CEffectFlameStream("toxic"), 1);
CEffectMgr.Register("frostStream", () => new CEffectFlameStream("frost"), 1);
CEffectMgr.Register("leafStream", () => new CEffectFlameStream("leaf"), 1);

// 옵션: size(광선 길이), 색 = color. 가는 광선이 사방으로 퍼지는 타격 폭발과 흰 중심, 튀는 알록달록한 불꽃
export class CEffectRayBurst extends CEffectSubject
{
    mRays: CEffectWedge[] = [];
    mCore: CPaint2D;
    mSp: CEffectSprite[] = [];
    mPx = 70;
    mSeed = 1;

    protected Build(_o: IEffectOption)
    {
        this.mPx = _o.size ?? 70;
        this.mSeed = Math.floor(Math.random() * 90) + 1;
        for (let i = 0; i < 20; i++) this.mRays.push(TakeWedge(this, i % 3 ? [1, 0.97, 0.85] : this.mColor));
        this.mCore = this.AddGlow(this.mPx * 0.8, this.mPx * 0.8, [1, 1, 0.9]);
        const cols: TRGB[] = [[1, 0.3, 0.2], [0.3, 0.5, 1], [1, 0.9, 0.3], [1, 1, 1]];
        for (let i = 0; i < 8; i++) this.mSp.push(CEffectPiece.Sprite(this, "dot", 1, cols[i % 4], true, 0.02, null, null));
    }

    protected Tick(_r: number)
    {
        const e = easeOut(Math.min(1, _r * 2.2)), a = Math.pow(1 - _r, 1.3);
        for (let i = 0; i < this.mRays.length; i++)
        {
            const ang = i * Math.PI * 2 / this.mRays.length + (rnd(this.mSeed, i) - 0.5) * 0.25;
            const len = this.mPx * (0.5 + rnd(this.mSeed + 2, i) * 0.9) * (0.35 + 0.65 * e);
            this.mRays[i].Place(ang, this.mPx * 0.06, len, 3 + 2 * rnd(this.mSeed + 4, i), a);
        }
        SetGlow(this.mCore, 0, 0, 0, Math.pow(1 - _r, 2));
        for (let i = 0; i < this.mSp.length; i++)
        {
            const ang = rnd(this.mSeed + 6, i) * Math.PI * 2, d = this.mPx * (0.3 + rnd(this.mSeed + 8, i) * 0.8) * e;
            this.mSp[i].Place(Math.cos(ang) * d, Math.sin(ang) * d, 0, 0.8 + rnd(this.mSeed + 9, i), a);
        }
    }
}

CEffectMgr.Register("rayBurst", () => new CEffectRayBurst(), 0.5);

// 옵션: radius(구체 반지름), 색 = color. 사이코 충전: 분홍 구체 둘레로 가는 흰·분홍 선이 불규칙하게 번쩍이며 사방으로 흩어진다
export class CEffectPsyCharge extends CEffectSubject
{
    mRays: CEffectWedge[] = [];
    mOrb: CEffectDisc;
    mGlow: CPaint2D;
    mR = 12;

    protected Build(_o: IEffectOption)
    {
        this.mR = _o.radius ?? 12;
        this.mGlow = this.AddGlow(this.mR * 5, this.mR * 5, this.mColor);
        this.mOrb = CEffectPiece.Disc(this, false, [1, 0.92, 0.98], false, this.mColor, 1.5, 0.05);
        for (let i = 0; i < 26; i++) this.mRays.push(TakeWedge(this, i % 2 ? WHITE : this.mColor));
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.2, 0.2), step = Math.floor(_now / 60), R = this.mR * (0.5 + 0.5 * easeOut(Math.min(1, _r * 2)));
        this.mOrb.Place(0, 0, R, R, 0, env);
        SetGlow(this.mGlow, 0, 0, 0, 0.8 * env);
        for (let i = 0; i < this.mRays.length; i++)
        {
            const on = rnd(step + i, 3) > 0.35, ang = rnd(i, 1) * Math.PI * 2 + (rnd(step, i) - 0.5) * 0.15;
            const r0 = this.mR * (1.1 + rnd(step, i + 40) * 1.8), len = this.mR * (1.5 + rnd(step + 7, i) * 4);
            this.mRays[i].Place(ang, r0, len, 1.6, on ? env * 0.9 : 0);
        }
    }
}

CEffectMgr.Register("psyCharge", () => new CEffectPsyCharge(), 0.4);

// 옵션: size(먼지 크기), n(덩어리 수), pit(구덩이 표시), 색 = color(흙색). 바닥을 갈아엎는 흙먼지와 튀는 파편
export class CEffectKickDust extends CEffectSubject
{
    mPuff: CPaint2D[] = [];
    mChip: CEffectSprite[] = [];
    mPit: CEffectDisc = null;
    mSize = 40;

    protected Build(_o: IEffectOption)
    {
        this.mSize = _o.size ?? 40;
        const n = _o.n ?? 9, c = _o.color ?? [0.62, 0.47, 0.32];
        if (_o.pit) this.mPit = CEffectPiece.Disc(this, false, [0.16, 0.11, 0.08], false, null, 1.5, -0.01);
        for (let i = 0; i < n; i++)
        {
            const p = CEffectPrim.Glow(2, 2, [c[0] * (0.85 + 0.3 * rnd(i, 2)), c[1] * (0.85 + 0.3 * rnd(i, 3)), c[2] * (0.85 + 0.3 * rnd(i, 4))], 0, false);
            this.PushComp(p);
            this.mPuff.push(p);
        }
        for (let i = 0; i < n; i++) this.mChip.push(CEffectPiece.Sprite(this, "dot", 1, [c[0] * 0.6, c[1] * 0.55, c[2] * 0.5], false, 0.02, null, null));
    }

    protected Tick(_r: number)
    {
        const S = this.mSize, e = easeOut(_r);
        if (this.mPit) this.mPit.Place(0, 0, S * 0.55 * Math.min(1, _r * 6), S * 0.32 * Math.min(1, _r * 6), 0, 0.9 * (1 - _r * _r));
        for (let i = 0; i < this.mPuff.length; i++)
        {
            const ang = rnd(i, 7) * 6.28, d = S * (0.2 + 0.7 * rnd(i, 8)) * e, sz = S * (0.35 + 0.5 * rnd(i, 9)) * (0.5 + 0.7 * e);
            SetGlow(this.mPuff[i], Math.cos(ang) * d, -(Math.sin(ang) * d * 0.6 + S * 0.25 * e), 0.01 + i * 0.0002, 0.6 * (1 - _r) * Math.min(1, _r * 8), sz * 2);
            const v = S * (1.1 + 1.6 * rnd(i, 11)), t = _r * 0.6, a2 = rnd(i, 12) * 6.28;
            this.mChip[i].Place(Math.cos(a2) * v * _r, Math.sin(a2) * v * _r * 0.7 + (S * 2.2 * t * (t - 0.35) * 2), 0, S * 0.04 * (0.6 + rnd(i, 13)), clamp(1 - _r * 1.2, 0, 1));
        }
    }
}

CEffectMgr.Register("kickDust", () => new CEffectKickDust(), 0.7);

// 소용돌이 종류: blades(날 개수), color(날 색), inner(날 속 밝은 색)
const SWIRL_STYLES: Record<string, { blades: number, color: TRGB, inner: TRGB }> = {
    air: { blades: 4, color: [0.4, 0.75, 1], inner: [0.92, 0.98, 1] },
    twister: { blades: 3, color: [0.3, 0.6, 1], inner: [0.85, 0.95, 1] },
    fire: { blades: 5, color: [1, 0.45, 0.12], inner: [1, 0.93, 0.6] },
    leaf: { blades: 3, color: [0.3, 0.8, 0.25], inner: [0.9, 1, 0.75] },
};

// 옵션: preset(종류), blades/color/inner(종류 값을 덮어씀), radius(반지름), spin(회전 속도). 진행은 vx/vy 옵션
// 휘어진 날이 둘레로 도는 회전 베기. 날 개수와 색만 바꿔 에어슬래시, 회오리, 불꽃 소용돌이, 잎 소용돌이로 쓴다
export class CEffectAirSlash extends CEffectSubject
{
    mPreset: string;
    mOuter: CEffectSprite[] = [];
    mInner: CEffectSprite[] = [];
    mGlow: CPaint2D;
    mCore: CPaint2D;
    mR = 56;
    mSpin = 9;

    constructor(_preset = "air")
    {
        super();
        this.mPreset = _preset;
    }

    protected Build(_o: IEffectOption)
    {
        const st = PickStyle(SWIRL_STYLES, _o.preset ?? this.mPreset, "air", _o, ["blades", "color", "inner"]);
        this.mR = _o.radius ?? 56;
        this.mSpin = _o.spin ?? 9;
        for (let b = 0; b < st.blades; b++)
        {
            this.mOuter.push(CEffectPiece.Sprite(this, "airblade", 1, st.color, false, 0.01, null, st.color, true));
            this.mInner.push(CEffectPiece.Sprite(this, "airblade_i", 1, st.inner, false, 0.03, null, null));
        }
        this.mGlow = this.AddGlow(this.mR * 3.2, this.mR * 3.2, st.color);
        this.mCore = this.AddGlow(this.mR * 0.9, this.mR * 0.9, WHITE);
    }

    protected Tick(_r: number, _now: number)
    {
        const env = envelope(_r, 0.12, 0.3), k = this.mR / 56 * (0.6 + 0.4 * easeOut(Math.min(1, _r * 3)));
        const spin = _now / 1000 * this.mSpin, n = this.mOuter.length;
        for (let b = 0; b < n; b++)
        {
            this.mOuter[b].Place(0, 0, spin + b * Math.PI * 2 / n, k, env);
            this.mInner[b].Place(0, 0, spin + b * Math.PI * 2 / n, k, env);
        }
        SetGlow(this.mGlow, 0, 0, -0.001, 0.55 * env);
        SetAlpha(this.mCore, Math.max(0.01, 0.9 * env));
    }
}

CEffectMgr.Register("airSlash", () => new CEffectAirSlash("air"), 0.8);
CEffectMgr.Register("twister", () => new CEffectAirSlash("twister"), 0.8);
CEffectMgr.Register("fireSwirl", () => new CEffectAirSlash("fire"), 0.8);
CEffectMgr.Register("leafSwirl", () => new CEffectAirSlash("leaf"), 0.8);
