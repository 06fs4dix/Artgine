// browser.js / remote.js의 screenshot 분석 옵션(avg/diff) 계산 모듈. 단독 실행 CLI는 없다.
// 캡처 결과(base64)를 파일로 거치지 않고 메모리에서 바로 디코드해 계산한다.
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { dirname, basename, join } from 'path';
import pngjs from 'pngjs';
import jpeg from 'jpeg-js';
import { tempPath, saveScreenshot } from './common.js';

const { PNG } = pngjs;

export function decodeImage(buf) {
    if (buf[0] === 0x89 && buf[1] === 0x50) {
        const png = PNG.sync.read(buf);
        return { width: png.width, height: png.height, data: png.data };
    }
    const j = jpeg.decode(buf, { useTArray: true });
    return { width: j.width, height: j.height, data: j.data };
}

export function loadImage(name) {
    const base = tempPath(name);
    const file = [base, base + '.png', base + '.jpg'].find((f) => existsSync(f));
    if (!file) throw new Error(`Reference image not found: ${base}(.png|.jpg)`);
    return decodeImage(readFileSync(file));
}

const r2 = (v) => Math.round(v * 100) / 100;

function rgbToHsv(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let hh = 0;
    if (d !== 0) {
        if (max === rn) hh = ((gn - bn) / d) % 6;
        else if (max === gn) hh = (bn - rn) / d + 2;
        else hh = (rn - gn) / d + 4;
        hh *= 60;
        if (hh < 0) hh += 360;
    }
    return [hh, max === 0 ? 0 : d / max, max];
}

function toModel(d, i, model) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (model === 'hsva') return [...rgbToHsv(r, g, b), a];
    if (model === 'luminance') return [0.299 * r + 0.587 * g + 0.114 * b];
    return [r, g, b, a];
}

function modelChannels(model) {
    if (model === 'hsva') return ['h', 's', 'v', 'a'];
    if (model === 'luminance') return ['y'];
    return ['r', 'g', 'b', 'a'];
}

function pixelDelta(a, b, i, model) {
    const va = toModel(a.data, i, model);
    const vb = toModel(b.data, i, model);
    let sq = 0;
    for (let k = 0; k < va.length; k++) sq += (va[k] - vb[k]) ** 2;
    return Math.sqrt(sq);
}

// 보라(작음) → 파랑 → 하늘 → 초록 → 노랑 → 빨강(큼)
const HEAT_STOPS = [[128, 0, 255], [0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 0, 0]];

function heatColor(t) {
    const p = Math.max(0, Math.min(1, t)) * (HEAT_STOPS.length - 1);
    const i = Math.min(HEAT_STOPS.length - 2, Math.floor(p));
    const f = p - i;
    const c0 = HEAT_STOPS[i], c1 = HEAT_STOPS[i + 1];
    return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * f));
}

// 변화량 지도. threshold 이하(변화 없음)는 현재 화면을 어두운 흑백으로 깔아 위치만 알아보게 하고,
// 변화 픽셀은 이번 비교의 최대 변화량(heatMax)을 빨강으로 정규화해 칠한다.
export function heatmapPng(a, b, { threshold = 0, model = 'rgba' } = {}) {
    const { width, height } = b;
    const n = width * height;
    const deltas = new Float32Array(n);
    let heatMax = 0;
    for (let p = 0; p < n; p++) {
        const d = pixelDelta(a, b, p * 4, model);
        deltas[p] = d;
        if (d > threshold && d > heatMax) heatMax = d;
    }
    const png = new PNG({ width, height });
    for (let p = 0; p < n; p++) {
        const i = p * 4;
        let rgb;
        if (deltas[p] > threshold && heatMax > 0) {
            rgb = heatColor(deltas[p] / heatMax);
        } else {
            const g = Math.round((0.299 * b.data[i] + 0.587 * b.data[i + 1] + 0.114 * b.data[i + 2]) * 0.35);
            rgb = [g, g, g];
        }
        png.data[i] = rgb[0]; png.data[i + 1] = rgb[1]; png.data[i + 2] = rgb[2]; png.data[i + 3] = 255;
    }
    return { png: PNG.sync.write(png), heatMax: r2(heatMax) };
}

export function avg(img, model = 'rgba') {
    const ch = modelChannels(model);
    const sum = new Array(ch.length).fill(0);
    const n = img.width * img.height;
    for (let i = 0; i < n * 4; i += 4) {
        const v = toModel(img.data, i, model);
        for (let k = 0; k < ch.length; k++) sum[k] += v[k];
    }
    return { model, ...Object.fromEntries(ch.map((c, k) => [c, r2(sum[k] / n)])) };
}

// 바뀐 픽셀(delta > threshold)을 gap 크기 칸으로 묶고, 8방향으로 맞닿은 칸끼리 한 영역으로 합친다.
// 픽셀 단위 연결만 보면 글자 한 줄 변경이 글자마다 따로 잡혀 영역이 수십 개로 쪼개진다.
// 결과적으로 대략 gap~2*gap px 이내로 떨어진 변화는 같은 영역이 된다.
export function diff(a, b, { threshold = 0, gap = 4, min = 1, top = 10, model = 'rgba', offsetX = 0, offsetY = 0 } = {}) {
    if (a.width !== b.width || a.height !== b.height) {
        throw new Error(`Size mismatch: ref ${a.width}x${a.height} vs current ${b.width}x${b.height} (use the same clip as the reference)`);
    }
    const { width, height } = a;
    const cell = Math.max(1, Math.trunc(gap));
    const cw = Math.ceil(width / cell);
    const ch = Math.ceil(height / cell);
    const cells = new Map();
    let diffCount = 0;
    let sumDelta = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const delta = pixelDelta(a, b, (y * width + x) * 4, model);
            sumDelta += delta;
            if (delta <= threshold) continue;
            diffCount++;
            const ci = Math.floor(y / cell) * cw + Math.floor(x / cell);
            let s = cells.get(ci);
            if (!s) { s = { minX: x, minY: y, maxX: x, maxY: y, pixels: 0, sum: 0, max: 0 }; cells.set(ci, s); }
            if (x < s.minX) s.minX = x;
            if (x > s.maxX) s.maxX = x;
            if (y < s.minY) s.minY = y;
            if (y > s.maxY) s.maxY = y;
            s.pixels++;
            s.sum += delta;
            if (delta > s.max) s.max = delta;
        }
    }

    const seen = new Set();
    const regions = [];
    for (const start of cells.keys()) {
        if (seen.has(start)) continue;
        seen.add(start);
        const stack = [start];
        const r = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, pixels: 0, sum: 0, max: 0 };
        while (stack.length) {
            const c = stack.pop();
            const s = cells.get(c);
            r.minX = Math.min(r.minX, s.minX); r.maxX = Math.max(r.maxX, s.maxX);
            r.minY = Math.min(r.minY, s.minY); r.maxY = Math.max(r.maxY, s.maxY);
            r.pixels += s.pixels; r.sum += s.sum; r.max = Math.max(r.max, s.max);
            const cx = c % cw, cy = Math.floor(c / cw);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
                    const ni = ny * cw + nx;
                    if (cells.has(ni) && !seen.has(ni)) { seen.add(ni); stack.push(ni); }
                }
            }
        }
        if (r.pixels < min) continue;
        regions.push({
            x: r.minX + offsetX, y: r.minY + offsetY, w: r.maxX - r.minX + 1, h: r.maxY - r.minY + 1,
            pixels: r.pixels, avgDelta: r2(r.sum / r.pixels), maxDelta: r2(r.max), _score: r.sum,
        });
    }
    regions.sort((p, q) => q._score - p._score);
    for (const r of regions) delete r._score;

    const total = width * height;
    return {
        model, threshold,
        diffRatio: r2((diffCount / total) * 100),
        avgDelta: r2(sumDelta / total),
        regionCount: regions.length,
        regions: regions.slice(0, top),
    };
}

export const wantsAnalysis = (opts) => !!(opts.avg || opts.diff);

// screenshot 마무리 공용: 분석(avg/diff) → 저장 → 결과 객체.
// 분석을 저장보다 먼저 한다 — diff 기준(ref)과 저장 이름이 같으면 저장이 기준을 덮어써 자기 자신과 비교하게 된다.
// origin은 캡처 영역(clip)의 화면 좌표로, diff 영역 좌표를 화면 기준으로 돌려주기 위해 더한다.
// diff.heatmap이면 저장 파일 자체가 원본 대신 변화량 지도(png)가 된다.
export function finishShot(b64, format, name, opts = {}, origin = { x: 0, y: 0 }) {
    const out = { ok: true };
    let saveB64 = b64;
    let saveFormat = format;
    if (wantsAnalysis(opts)) {
        try {
            const img = decodeImage(Buffer.from(b64, 'base64'));
            out.width = img.width;
            out.height = img.height;
            if (opts.avg) out.avg = avg(img, opts.avg.model ?? 'rgba');
            if (opts.diff) {
                const d = typeof opts.diff === 'string' ? { ref: opts.diff } : opts.diff;
                const ref = loadImage(d.ref);
                out.diff = { ref: d.ref, ...diff(ref, img, { ...d, offsetX: origin.x ?? 0, offsetY: origin.y ?? 0 }) };
                if (d.heatmap) {
                    const h = heatmapPng(ref, img, d);
                    out.diff.heatMax = h.heatMax;
                    out.saved = 'heatmap';
                    saveB64 = h.png.toString('base64');
                    saveFormat = 'png';
                }
            }
        } catch (e) {
            out.ok = false;
            out.msg = e.message;
        }
    }
    out.file = saveScreenshot(saveB64, saveFormat, name);
    return out;
}

// record 마무리 공용: 프레임별 분석 → temp/<name>_NNN 저장 → 결과 객체(이미지 데이터 제외).
// diff "prev"는 직전 프레임과 비교한다(첫 프레임은 diff 없음). 이전 record의 같은 이름 프레임은 먼저 지운다 —
// 프레임 수가 줄었을 때 옛 파일이 섞여 남으면 결과로 오인한다. 단, diff 기준은 지우기 전에 읽는다.
export function finishFrames(r, name, opts = {}, origin = { x: 0, y: 0 }) {
    const d = typeof opts.diff === 'string' ? { ref: opts.diff } : opts.diff;
    const ref = d && d.ref !== 'prev' ? loadImage(d.ref) : null;

    const base = tempPath(name);
    const prefix = basename(base) + '_';
    for (const f of readdirSync(dirname(base))) {
        if (f.startsWith(prefix) && /^\d{3}\.(png|jpg)$/.test(f.slice(prefix.length))) unlinkSync(join(dirname(base), f));
    }

    let prev = null;
    const changed = [];
    const frames = r.frames.map((f, i) => {
        const out = { i, t: f.t };
        if (f.frameT != null) out.frameT = f.frameT;
        if (f.repeat) out.repeat = true;
        let saveB64 = f.data;
        let saveFormat = r.format;
        if (wantsAnalysis(opts)) {
            try {
                const img = decodeImage(Buffer.from(f.data, 'base64'));
                if (opts.avg) out.avg = avg(img, opts.avg.model ?? 'rgba');
                const cmp = ref ?? prev;
                if (d && cmp) {
                    out.diff = diff(cmp, img, { ...d, offsetX: origin.x ?? 0, offsetY: origin.y ?? 0 });
                    if (out.diff.regionCount > 0) changed.push(i);
                    if (d.heatmap) {
                        const h = heatmapPng(cmp, img, d);
                        out.diff.heatMax = h.heatMax;
                        out.saved = 'heatmap';
                        saveB64 = h.png.toString('base64');
                        saveFormat = 'png';
                    }
                }
                prev = img;
            } catch (e) {
                out.msg = e.message;
            }
        }
        out.file = saveScreenshot(saveB64, saveFormat, `${name}_${String(i).padStart(3, '0')}`);
        return out;
    });

    const result = { ok: true, mode: r.mode, format: r.format, duration: r.duration, fps: r.fps, count: frames.length };
    if (r.truncated) result.truncated = true;
    if (d) {
        result.diffRef = d.ref;
        result.changed = changed;
    }
    result.inputs = r.inputs;
    result.frames = frames;
    return result;
}
