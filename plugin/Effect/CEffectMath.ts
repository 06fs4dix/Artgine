import type { TRGB } from "./CEffectPrim.js";

// 이펙트 전반에서 쓰는 수학/색 도우미. 파일마다 따로 만들지 말고 여기서 가져다 쓴다
export const WHITE: TRGB = [1, 1, 1];

export const clamp = (_v: number, _a: number, _b: number) => Math.max(_a, Math.min(_b, _v));
// 알파를 steps 단계로 끊는다. 같은 단계면 텍스처 알파를 다시 쓰지 않아도 되므로 매 프레임 갱신 비용을 줄인다
export const QuantAlpha = (_a: number, _steps: number) => Math.round(clamp(_a, 0, 1) * _steps) / _steps;
export const lerp = (_a: number, _b: number, _t: number) => _a + (_b - _a) * _t;
export const easeOut = (_t: number) => 1 - (1 - _t) * (1 - _t);

// 시드와 번호로 항상 같은 0~1 값을 돌려준다(프레임이 달라도 모양이 흔들리지 않게 할 때)
export const rnd = (_seed: number, _i: number) => { const s = Math.sin(_seed * 12.9898 + _i * 78.233) * 43758.5453; return s - Math.floor(s); };

// 0→1 로 올라갔다가 1→0 으로 내려오는 곡선. in/out 은 오르내리는 구간의 비율
export const envelope = (_r: number, _in: number, _out: number) => Math.min(1, _r / Math.max(1e-4, _in), (1 - _r) / Math.max(1e-4, _out));

export function Mix(_a: TRGB, _b: TRGB, _t: number): TRGB
{
    return [lerp(_a[0], _b[0], _t), lerp(_a[1], _b[1], _t), lerp(_a[2], _b[2], _t)];
}

// 기술 이름으로 정하는 고정 값. 같은 이름이면 같은 변형을 고르는 데 쓴다
export function NameHash(_name: string): number
{
    let h = 7;
    for (const ch of (_name || "").toLowerCase().replace(/[^a-z0-9]/g, "")) h = (31 * h + ch.charCodeAt(0)) >>> 0;
    return h;
}

// 길이 _len 을 _n 칸으로 나눈 꺾인 경로를 _out 에 [x0, y0, x1, y1, ...] 로 채운다. 양 끝은 y=0 으로 고정하고
// 가운데는 _amp 안에서 step 마다 새로 튄다(step 이 같으면 같은 모양)
export function JaggedPath(_n: number, _len: number, _amp: number, _step: number, _out: number[])
{
    for (let i = 0; i <= _n; i++)
    {
        const taper = Math.min(1, i / 2, (_n - i) / 2);
        _out[i * 2] = _len * (i + (i > 0 && i < _n ? (rnd(_step, 140 + i) - 0.5) * 0.7 : 0)) / _n;
        _out[i * 2 + 1] = (rnd(_step, i) - 0.5) * 2 * _amp * (0.4 + 0.6 * rnd(_step, 170 + i)) * taper;
    }
}
