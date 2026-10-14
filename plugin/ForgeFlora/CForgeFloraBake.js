import { CForgeFloraTex } from "./CForgeFloraTex.js";
export class CForgeFloraBake {
    static sGain = 1.25;
    static Impostor(_b, _tex, _bound, _size) {
        const S2 = _size * 2, M = Math.max(_bound[3] - _bound[0], _bound[4] - _bound[1], _bound[5] - _bound[2]) || 1;
        const cx = (_bound[0] + _bound[3]) * 0.5, cy = (_bound[1] + _bound[4]) * 0.5, z0 = _bound[2], zr = (_bound[5] - _bound[2]) || 1;
        const col = new Float32Array(S2 * S2 * 3), zb = new Float32Array(S2 * S2).fill(-Infinity), hit = new Uint8Array(S2 * S2);
        const P = _b.mPos, UV = _b.mUV, N = _b.mNor, I = _b.mIdx;
        const X = (_i) => (P[_i * 3] - cx) / M * S2 + S2 / 2, Y = (_i) => S2 / 2 - (P[_i * 3 + 1] - cy) / M * S2;
        for (let t = 0; t < I.length; t += 3) {
            const a = I[t], b = I[t + 1], c = I[t + 2];
            const ax = X(a), ay = Y(a), bx = X(b), by = Y(b), qx = X(c), qy = Y(c);
            const area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
            if (Math.abs(area) < 1e-9)
                continue;
            const x0 = Math.max(0, Math.floor(Math.min(ax, bx, qx))), x1 = Math.min(S2 - 1, Math.ceil(Math.max(ax, bx, qx)));
            const y0 = Math.max(0, Math.floor(Math.min(ay, by, qy))), y1 = Math.min(S2 - 1, Math.ceil(Math.max(ay, by, qy)));
            const key = _tex[_b.mSlot[a]] ?? _tex[0];
            for (let y = y0; y <= y1; y++)
                for (let x = x0; x <= x1; x++) {
                    const px = x + 0.5, py = y + 0.5;
                    const w0 = ((bx - px) * (qy - py) - (by - py) * (qx - px)) / area;
                    const w1 = ((qx - px) * (ay - py) - (qy - py) * (ax - px)) / area;
                    const w2 = 1 - w0 - w1;
                    if (w0 < 0 || w1 < 0 || w2 < 0)
                        continue;
                    const z = P[a * 3 + 2] * w0 + P[b * 3 + 2] * w1 + P[c * 3 + 2] * w2, o = y * S2 + x;
                    if (z <= zb[o])
                        continue;
                    const s = CForgeFloraTex.Sample(key, UV[a * 2] * w0 + UV[b * 2] * w1 + UV[c * 2] * w2, UV[a * 2 + 1] * w0 + UV[b * 2 + 1] * w1 + UV[c * 2 + 1] * w2);
                    if (s[3] < 128)
                        continue;
                    zb[o] = z;
                    hit[o] = 1;
                    const ny = N[a * 3 + 1] * w0 + N[b * 3 + 1] * w1 + N[c * 3 + 1] * w2, l = CForgeFloraBake.sGain * (0.84 + 0.16 * (z - z0) / zr) * (0.94 + 0.06 * ny);
                    col[o * 3] = s[0] * l;
                    col[o * 3 + 1] = s[1] * l;
                    col[o * 3 + 2] = s[2] * l;
                }
        }
        const Sz = _size, out = new Uint8Array(Sz * Sz * 4), done = new Uint8Array(Sz * Sz);
        let mr = 0, mg = 0, mb = 0, mn = 0;
        for (let y = 0; y < Sz; y++)
            for (let x = 0; x < Sz; x++) {
                let r = 0, g = 0, bl = 0, n = 0;
                for (let k = 0; k < 4; k++) {
                    const o = (y * 2 + (k >> 1)) * S2 + x * 2 + (k & 1);
                    if (!hit[o])
                        continue;
                    r += col[o * 3];
                    g += col[o * 3 + 1];
                    bl += col[o * 3 + 2];
                    n++;
                }
                if (n < 2)
                    continue;
                const i = y * Sz + x;
                out[i * 4] = Math.min(255, r / n);
                out[i * 4 + 1] = Math.min(255, g / n);
                out[i * 4 + 2] = Math.min(255, bl / n);
                out[i * 4 + 3] = 255;
                done[i] = 1;
                mr += out[i * 4];
                mg += out[i * 4 + 1];
                mb += out[i * 4 + 2];
                mn++;
            }
        CForgeFloraBake.Bleed(out, done, Sz, 8, mn > 0 ? [mr / mn, mg / mn, mb / mn] : [0, 0, 0]);
        return out;
    }
    static Bleed(_buf, _done, _n, _pass, _rest) {
        for (let p = 0; p < _pass; p++) {
            const add = [];
            for (let y = 0; y < _n; y++)
                for (let x = 0; x < _n; x++) {
                    const i = y * _n + x;
                    if (_done[i])
                        continue;
                    let r = 0, g = 0, b = 0, c = 0;
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const qx = x + dx, qy = y + dy;
                        if (qx < 0 || qy < 0 || qx >= _n || qy >= _n)
                            continue;
                        const j = qy * _n + qx;
                        if (!_done[j])
                            continue;
                        r += _buf[j * 4];
                        g += _buf[j * 4 + 1];
                        b += _buf[j * 4 + 2];
                        c++;
                    }
                    if (c == 0)
                        continue;
                    _buf[i * 4] = r / c;
                    _buf[i * 4 + 1] = g / c;
                    _buf[i * 4 + 2] = b / c;
                    add.push(i);
                }
            for (const i of add)
                _done[i] = 1;
        }
        for (let i = 0; i < _n * _n; i++)
            if (!_done[i]) {
                _buf[i * 4] = _rest[0];
                _buf[i * 4 + 1] = _rest[1];
                _buf[i * 4 + 2] = _rest[2];
            }
    }
}
