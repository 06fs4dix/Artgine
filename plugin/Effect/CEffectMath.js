export const WHITE = [1, 1, 1];
export const clamp = (_v, _a, _b) => Math.max(_a, Math.min(_b, _v));
export const QuantAlpha = (_a, _steps) => Math.round(clamp(_a, 0, 1) * _steps) / _steps;
export const lerp = (_a, _b, _t) => _a + (_b - _a) * _t;
export const easeOut = (_t) => 1 - (1 - _t) * (1 - _t);
export const rnd = (_seed, _i) => { const s = Math.sin(_seed * 12.9898 + _i * 78.233) * 43758.5453; return s - Math.floor(s); };
export const envelope = (_r, _in, _out) => Math.min(1, _r / Math.max(1e-4, _in), (1 - _r) / Math.max(1e-4, _out));
export function Mix(_a, _b, _t) {
    return [lerp(_a[0], _b[0], _t), lerp(_a[1], _b[1], _t), lerp(_a[2], _b[2], _t)];
}
export function NameHash(_name) {
    let h = 7;
    for (const ch of (_name || "").toLowerCase().replace(/[^a-z0-9]/g, ""))
        h = (31 * h + ch.charCodeAt(0)) >>> 0;
    return h;
}
export function JaggedPath(_n, _len, _amp, _step, _out) {
    for (let i = 0; i <= _n; i++) {
        const taper = Math.min(1, i / 2, (_n - i) / 2);
        _out[i * 2] = _len * (i + (i > 0 && i < _n ? (rnd(_step, 140 + i) - 0.5) * 0.7 : 0)) / _n;
        _out[i * 2 + 1] = (rnd(_step, i) - 0.5) * 2 * _amp * (0.4 + 0.6 * rnd(_step, 170 + i)) * taper;
    }
}
