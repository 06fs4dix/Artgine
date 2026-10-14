import { CTexture } from "../../artgine/render/CTexture.js";
import { CForgeRand } from "./CForgeRand.js";
export class CForgeTexSurf {
    mNor;
    mMat;
    mParallax;
    constructor(mNor, mMat, mParallax) {
        this.mNor = mNor;
        this.mMat = mMat;
        this.mParallax = mParallax;
    }
}
export class CForgeTex {
    static sSize = 256;
    static sMeter = 2;
    static sUVOff = 256;
    static sParallaxNear = 1000;
    static sParallaxFar = 3500;
    static sPlaster = "forge_plaster.tex";
    static sStone = "forge_stone.tex";
    static sTile = "forge_tile.tex";
    static sWood = "forge_wood.tex";
    static sGlass = "forge_glass.tex";
    static sPlank = "forge_plank.tex";
    static sLog = "forge_log.tex";
    static sThatch = "forge_thatch.tex";
    static sShingle = "forge_shingle.tex";
    static sFlatMat = "forge_flat_m.tex";
    static sGiwa = "forge_giwa.tex";
    static sChangho = "forge_changho.tex";
    static sChoga = "forge_choga.tex";
    static sSeongdol = "forge_seongdol.tex";
    static sDoldam = "forge_doldam.tex";
    static sKawara = "forge_kawara.tex";
    static sShitami = "forge_shitami.tex";
    static sKoshi = "forge_koshi.tex";
    static sShoji = "forge_shoji.tex";
    static sTake = "forge_take.tex";
    static sIshigaki = "forge_ishigaki.tex";
    static sKaya = "forge_kaya.tex";
    static sQingzhuan = "forge_qingzhuan.tex";
    static sChuang = "forge_chuang.tex";
    static sBrickWall = "forge_brickwall.tex";
    static sSash = "forge_sash.tex";
    static sTurf = "forge_turf.tex";
    static sHangtu = "forge_hangtu.tex";
    static sAdobe = "forge_adobe.tex";
    static sMudBrick = "forge_mudbrick.tex";
    static sAshlar = "forge_ashlar.tex";
    static sInca = "forge_inca.tex";
    static sFelt = "forge_felt.tex";
    static sDryCourse = "forge_drycourse.tex";
    static sHiero = "forge_hiero.tex";
    static sSurf = new Map();
    static sPend = new Map();
    static sBase = new Map();
    static sFrame = null;
    static TNoise(_x, _y, _p, _seed) {
        const xi = Math.floor(_x), yi = Math.floor(_y), xf = _x - xi, yf = _y - yi;
        const H = (_i, _j) => CForgeRand.HashF(((_i % _p) + _p) % _p, ((_j % _p) + _p) % _p, _seed);
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    static TNoise2(_x, _y, _px, _py, _seed) {
        const xi = Math.floor(_x), yi = Math.floor(_y), xf = _x - xi, yf = _y - yi;
        const H = (_i, _j) => CForgeRand.HashF(((_i % _px) + _px) % _px, ((_j % _py) + _py) % _py, _seed);
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    static Knot(_x, _y, _cols, _rows, _chance, _seed) {
        const N = CForgeTex.sSize, cw = N / _cols, ch = N / _rows, ci = Math.floor(_x / cw), cj = Math.floor(_y / ch);
        let best = 9;
        for (let dj = -1; dj <= 1; dj++)
            for (let di = -1; di <= 1; di++) {
                const i = ((ci + di) % _cols + _cols) % _cols, j = ((cj + dj) % _rows + _rows) % _rows;
                if (CForgeRand.HashF(i, j, _seed) > _chance)
                    continue;
                const cx = (ci + di + 0.2 + CForgeRand.HashF(i, j, _seed + 1) * 0.6) * cw, cy = (cj + dj + 0.2 + CForgeRand.HashF(i, j, _seed + 2) * 0.6) * ch;
                const r = 5 + CForgeRand.HashF(i, j, _seed + 3) * 7;
                best = Math.min(best, Math.hypot(_x - cx, (_y - cy) * 0.45) / r);
            }
        return best;
    }
    static Fbm(_x, _y, _p, _seed) {
        let s = 0, amp = 0.5, n = 0;
        for (let o = 0; o < 4; o++) {
            s += CForgeTex.TNoise(_x * (1 << o), _y * (1 << o), _p * (1 << o), _seed + o) * amp;
            n += amp;
            amp *= 0.5;
        }
        return s / n;
    }
    static Build(_frame) {
        CForgeTex.sFrame = _frame;
        if (_frame.Res().Find(CForgeTex.sPlaster) != null)
            return;
        const N = CForgeTex.sSize;
        CForgeTex.Make(_frame, CForgeTex.sPlaster, (x, y) => {
            const f = CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 11);
            return [0.95 + (f - 0.5) * 0.12 + (CForgeRand.HashF(x, y, 3) - 0.5) * 0.03, 0.5 + (CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 17) - 0.5) * 0.6];
        }, 1.2, 0.92, 0.1, 1.5, 0);
        CForgeTex.Make(_frame, CForgeTex.sStone, CForgeTex.StoneFn(N), 10, 0.9, 0.2, 3, 0.06);
        CForgeTex.Make(_frame, CForgeTex.sTile, CForgeTex.TileFn(N), 9, 0.74, 0.2, 2.5, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sWood, (x, y) => CForgeTex.Grain(x, y, 5), 5, 0.9, 0.15, 2.4, 0);
        CForgeTex.Make(_frame, CForgeTex.sGlass, (x, y) => {
            const u = x / 16 + y / 32, v = x / 16 - y / 32, fu = u - Math.floor(u), fv = v - Math.floor(v);
            const e = Math.min(fu, 1 - fu, fv, 1 - fv) * 16;
            if (e < 1.2)
                return [0.95, 0.85];
            const sheen = Math.max(0, 1 - Math.abs(((x + y * 0.6) % 128) / 64 - 1) * 3);
            return [0.2 + sheen * 0.1 + (CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 41) - 0.5) * 0.06, 0.3];
        }, 4, 0.35, -0.6, 1, 0);
        CForgeTex.Make(_frame, CForgeTex.sPlank, (x, y) => {
            const pw = N / 8, k = Math.floor(x / pw), fx = x - k * pw;
            if (fx < 2 || fx > pw - 1)
                return [0.5, 0.05];
            const bevel = Math.min(1, Math.min(fx - 2, pw - 1 - fx) / 3), [gl, gh] = CForgeTex.Grain(x + k * 37, y + k * 91, 51);
            return [(0.86 + CForgeRand.HashF(k, 0, 52) * 0.14) * (0.92 + bevel * 0.08) * gl / 0.84, 0.3 + bevel * 0.4 + (gh - 0.6) * 0.7];
        }, 6, 0.9, 0.15, 2.4, 0);
        CForgeTex.Make(_frame, CForgeTex.sLog, (x, y) => {
            const rh = N / 8, r = Math.floor(y / rh), t = (y - r * rh) / rh;
            if (t < 0.05 || t > 0.95)
                return [0.78, 0.05];
            const h = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) * (t * 2 - 1))), tone = 0.86 + CForgeRand.HashF(r, 0, 62) * 0.14, [gl, gh] = CForgeTex.Grain(y, x, 61);
            return [tone * (0.62 + h * 0.36) * gl / 0.84, 0.12 + h * 0.8 + (gh - 0.6) * 0.35];
        }, 6, 0.92, 0.15, 2.5, 0.04);
        CForgeTex.Make(_frame, CForgeTex.sThatch, (x, y) => {
            const rows = 6, jag = (CForgeTex.TNoise(x / N * 20, 0.5, 20, 77) - 0.5) * 0.35 + (CForgeTex.TNoise(x / N * 52, 1.5, 52, 78) - 0.5) * 0.15;
            const yy = y / (N / rows) + jag, r = Math.floor(yy), t = yy - r, ri = ((r % rows) + rows) % rows;
            const str = CForgeTex.TNoise(x / N * 80, t * 1.5 + ri * 7.3, 80, 71), str2 = CForgeTex.TNoise(x / N * 36, t * 0.8 + ri * 5.1, 36, 79);
            const ridge = 1 - Math.abs(str * 2 - 1), clump = CForgeTex.Fbm(x / N * 6, t * 0.5 + ri * 1.3, 6, 72);
            const shade = 0.58 + 0.42 * Math.min(1, t * 2.2), tip = t > 0.88 ? (t - 0.88) * 1.5 : 0;
            return [(0.74 + ridge * 0.26 + (str2 - 0.5) * 0.22 + (clump - 0.5) * 0.22 + tip) * shade,
                0.08 + 0.7 * Math.pow(Math.min(1, t * 1.1), 0.8) + ridge * 0.14 + (str2 - 0.5) * 0.08];
        }, 8, 0.95, 0.35, 3, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sShingle, (x, y) => {
            const rh = N / 10, r = Math.floor(y / rh), t = (y - r * rh) / rh, w = N / 9, xs = x + CForgeRand.HashF(r, 0, 81) * w, k = Math.floor(xs / w), fx = (xs - k * w) / w;
            if (fx < 0.05)
                return [0.35, 0.05];
            const tone = 0.78 + CForgeRand.HashF(r, k % 9, 82) * 0.22, g = CForgeTex.TNoise(x / N * 40, y / N * 4, 40, 83);
            return [tone * (0.68 + Math.min(1, t * 4) * 0.32) + (g - 0.5) * 0.12, 0.2 + t * 0.65];
        }, 6, 0.9, 0.15, 2.5, 0.04);
        CForgeTex.Make(_frame, CForgeTex.sGiwa, (x, y) => {
            const cw = N / 7, k = Math.floor(x / cw), fx = (x - k * cw) / cw, n = (CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 91) - 0.5) * 0.06;
            if (fx > 0.6) {
                const t = (fx - 0.6) / 0.4, round = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) * (t * 2 - 1))), seg = (y + CForgeRand.HashF(k, 0, 92) * 20) % (N / 6) / (N / 6);
                const lip = seg > 0.93 ? 0.8 : 1;
                return [(0.55 + round * 0.45) * lip + n, 0.45 + round * 0.55 - (seg > 0.93 ? 0.12 : 0)];
            }
            const t = fx / 0.6, trough = 1 - Math.sin(t * Math.PI) * 0.6, row = (y / (N / 8)) % 1;
            return [(0.5 + 0.18 * trough) * (0.78 + 0.22 * Math.min(1, row * 2.5)) + n, 0.05 + 0.18 * trough + 0.18 * Math.min(1, row * 1.2)];
        }, 9, 0.8, 0.15, 2.8, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sChangho, (x, y) => {
            const sx = x % 8, fy = y / N, band = [0.08, 0.47, 0.86].some(_b => fy > _b && fy < _b + 0.06 && Math.floor((fy - _b) * N) % 5 < 2);
            const slat = sx < 2 || band, paper = 0.93 + (CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 95) - 0.5) * 0.06;
            return slat ? [0.42, 0.9] : [paper, 0.25];
        }, 5, 0.85, 0.1, 2, 0);
        CForgeTex.Make(_frame, CForgeTex.sChoga, (x, y) => {
            const g = N / 4, fx = x % g, fy = y % g, rope = Math.min(fx, g - fx, fy, g - fy);
            const str = CForgeTex.TNoise2(x / N * 70, y / N * 5, 70, 5, 97), clump = CForgeTex.Fbm(x / N * 5, y / N * 5, 5, 98);
            if (rope < 2)
                return [0.62 + (str - 0.5) * 0.1, 0.85 - rope * 0.1];
            return [0.8 + (str - 0.5) * 0.22 + (clump - 0.5) * 0.18, 0.45 + (str - 0.5) * 0.25 + (clump - 0.5) * 0.3 - Math.max(0, 6 - rope) * 0.03];
        }, 5, 0.95, 0.2, 2.2, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sSeongdol, CForgeTex.SeongdolFn(N), 11, 0.88, 0.2, 3.2, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sDoldam, CForgeTex.DoldamFn(N), 12, 0.92, 0.25, 3.5, 0.04);
        CForgeTex.Make(_frame, CForgeTex.sKawara, (x, y) => {
            const cw = N / 7, fx = (x % cw) / cw, wave = 0.5 + 0.5 * Math.cos((fx - 0.35) * Math.PI * 2), row = (y / (N / 8)) % 1;
            const n = (CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 161) - 0.5) * 0.05;
            return [(0.62 + wave * 0.32) * (0.72 + 0.28 * Math.min(1, row * 3)) + n, 0.1 + wave * 0.5 + 0.3 * Math.min(1, row * 1.15)];
        }, 8, 0.72, 0.15, 2.6, 0.04);
        CForgeTex.Make(_frame, CForgeTex.sShitami, (x, y) => {
            const t = (y % (N / 10)) / (N / 10), [gl] = CForgeTex.Grain(y, x, 165);
            if (x % (N / 2) < 6)
                return [0.92 * gl / 0.84, 0.95];
            return [(0.62 + 0.38 * Math.min(1, t * 4)) * gl / 0.84, 0.2 + t * 0.55];
        }, 6, 0.85, 0.15, 2.4, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sKoshi, (x, y) => {
            const fx = x % 8, [gl] = CForgeTex.Grain(x, y, 167);
            if (y % (N / 2) < 5)
                return [0.85 * gl / 0.84, 1];
            if (fx >= 5)
                return [0.12, 0];
            const r = Math.sin((fx + 0.5) / 5 * Math.PI);
            return [(0.7 + r * 0.3) * gl / 0.84, 0.55 + r * 0.4];
        }, 6, 0.85, 0.1, 2.5, 0);
        CForgeTex.Make(_frame, CForgeTex.sShoji, (x, y) => {
            const paper = 0.94 + (CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 169) - 0.5) * 0.05;
            return x % 32 < 2 || y % 32 < 2 ? [0.55, 0.9] : [paper, 0.3];
        }, 5, 0.85, 0.1, 2, 0);
        CForgeTex.Make(_frame, CForgeTex.sTake, (x, y) => {
            const k = Math.floor(x / 8), fx = (x - k * 8) / 8, round = Math.sqrt(Math.max(0, 1 - (fx * 2 - 1) * (fx * 2 - 1)));
            if (fx < 0.1)
                return [0.25, 0];
            const ny = ((y + CForgeRand.HashF(k, 0, 171) * N) % (N / 5)) / (N / 5), node = ny < 0.04, n = (CForgeTex.TNoise2(x / N * 32, y / N * 2, 32, 2, 172) - 0.5) * 0.08;
            return [(0.58 + round * 0.38) * (node ? 0.85 : 1) + n, 0.2 + round * 0.6 + (node ? 0.18 : 0)];
        }, 6, 0.6, 0.1, 2.4, 0);
        CForgeTex.Make(_frame, CForgeTex.sIshigaki, CForgeTex.IshigakiFn(N), 12, 0.92, 0.2, 3.4, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sKaya, (x, y) => {
            const str = CForgeTex.TNoise2(x / N * 90, y / N * 4, 90, 4, 191), str2 = CForgeTex.TNoise2(x / N * 36, y / N * 2, 36, 2, 192);
            const clump = CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 193), ridge = 1 - Math.abs(str * 2 - 1);
            return [0.7 + ridge * 0.2 + (str2 - 0.5) * 0.15 + (clump - 0.5) * 0.25, 0.4 + ridge * 0.3 + (clump - 0.5) * 0.3];
        }, 6, 0.95, 0.2, 2.4, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sQingzhuan, (x, y) => {
            const rh = N / 20, r = Math.floor(y / rh), bw = N / 5, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 5, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 201);
            if (fy < 1.5 || fx < 1.5)
                return [1.0 + (n - 0.5) * 0.06, 0.1];
            const edge = Math.min(fy - 1.5, rh - fy, fx - 1.5, bw - fx), bevel = Math.min(1, edge / 3);
            return [(0.74 + CForgeRand.HashF(r % 20, k, 202) * 0.22) * (0.9 + bevel * 0.1) + (n - 0.5) * 0.1 + (CForgeRand.HashF(x, y, 203) - 0.5) * 0.04, 0.35 + bevel * 0.5 + (n - 0.5) * 0.1];
        }, 8, 0.9, 0.15, 2.6, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sChuang, (x, y) => {
            const fx = x % 32, fy = y % 32, d = Math.abs(fx - 16) + Math.abs(fy - 16), [gl] = CForgeTex.Grain(x, y, 205);
            const bar = fx < 3 || fy < 3 || Math.abs(d - 11) < 1.6;
            return bar ? [0.9 * gl / 0.84, 0.9] : [0.14, 0];
        }, 6, 0.85, 0.1, 2.5, 0);
        CForgeTex.Make(_frame, CForgeTex.sBrickWall, (x, y) => {
            const rh = N / 26, r = Math.floor(y / rh), bw = N / 9, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 9, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 12, y / N * 12, 12, 211);
            if (fy < 1.3 || fx < 1.6)
                return [1.15 + (n - 0.5) * 0.08, 0.15];
            const tone = 0.7 + CForgeRand.HashF(r % 26, k, 212) * 0.3, burn = CForgeRand.HashF(r % 26, k, 213) < 0.12 ? 0.75 : 1;
            return [tone * burn + (n - 0.5) * 0.12 + (CForgeRand.HashF(x, y, 214) - 0.5) * 0.05, 0.5 + (n - 0.5) * 0.2];
        }, 7, 0.9, 0.15, 2.4, 0.02);
        CForgeTex.Make(_frame, CForgeTex.sSash, (x, y) => {
            const fx = x % 32, fy = y % 64;
            if (fx < 3 || fy < 3)
                return [0.95, 0.9];
            return [0.22 + (1 - fy / 64) * 0.12 + Math.max(0, 1 - Math.abs((fx - fy * 0.5) % 20 - 10) / 3) * 0.08, 0.2];
        }, 4, 0.4, -0.5, 1, 0);
        CForgeTex.Make(_frame, CForgeTex.sTurf, (x, y) => {
            const blade = CForgeTex.TNoise2(x / N * 64, y / N * 24, 64, 24, 221), clump = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 222), soil = CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 223);
            return [0.72 + (blade - 0.5) * 0.3 + (clump - 0.5) * 0.3 - Math.max(0, soil - 0.62) * 0.8, 0.4 + blade * 0.3 + (clump - 0.5) * 0.3];
        }, 5, 0.95, 0.2, 2.4, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sHangtu, (x, y) => {
            const rh = N / 16, r = Math.floor(y / rh), fy = (y - r * rh) / rh, n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 231), pit = CForgeRand.HashF(x, y, 232) > 0.985 ? -0.2 : 0;
            const seam = fy < 0.08 ? 0.82 : 1, tone = 0.84 + CForgeRand.HashF(r % 16, 0, 233) * 0.16;
            return [tone * seam + (n - 0.5) * 0.14 + pit, 0.4 + (fy < 0.08 ? -0.3 : 0) + (n - 0.5) * 0.2];
        }, 5, 0.95, 0.2, 2.6, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sAdobe, (x, y) => {
            const lump = CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 241), smear = CForgeTex.TNoise2((x + y * 0.6) / N * 18, (y - x * 0.3) / N * 5, 18, 5, 242);
            const rain = Math.max(0, CForgeTex.TNoise2(x / N * 22, y / N * 2, 22, 2, 243) - 0.58) * 0.5, pit = CForgeRand.HashF(x, y, 244) > 0.993 ? -0.2 : 0, grit = (CForgeRand.HashF(x, y, 245) - 0.5) * 0.05;
            return [0.92 + (lump - 0.5) * 0.16 + (smear - 0.5) * 0.1 - rain + pit + grit, 0.5 + (lump - 0.5) * 0.55 + (smear - 0.5) * 0.25 - rain * 0.6 + pit];
        }, 4, 0.95, 0.2, 2.2, 0.02);
        CForgeTex.Make(_frame, CForgeTex.sMudBrick, (x, y) => {
            const rh = N / 16, r = Math.floor(y / rh), bw = N / 5, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 5, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 9, y / N * 9, 9, 251), straw = CForgeTex.TNoise2(x / N * 60, y / N * 20, 60, 20, 252);
            const edge = Math.min(fy, rh - fy, fx, bw - fx) + (n - 0.5) * 2.5;
            if (edge < 2)
                return [0.72 + (n - 0.5) * 0.1, 0.08];
            const t = Math.min(1, (edge - 2) / 6), bevel = Math.sqrt(t * (2 - t)), tone = 0.82 + CForgeRand.HashF(r % 16, k, 253) * 0.18;
            return [tone * (0.9 + bevel * 0.1) + (n - 0.5) * 0.12 + (straw > 0.82 ? 0.06 : 0), 0.3 + bevel * 0.5 + (n - 0.5) * 0.2];
        }, 6, 0.95, 0.2, 2.6, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sAshlar, (() => {
            const rows = 4, rh = N / rows, cuts = [];
            for (let r = 0; r < rows; r++) {
                const c = [];
                let x = CForgeRand.HashF(r, 0, 261) * N * 0.5;
                const end = x + N;
                while (end - x > N * 0.3) {
                    c.push(x % N);
                    x += N * (0.35 + CForgeRand.HashF(r, c.length, 262) * 0.4);
                }
                cuts.push(c.sort((_a, _b) => _a - _b));
            }
            return (x, y) => {
                const r = Math.floor(y / rh), fy = y - r * rh, c = cuts[r];
                let k = c.findIndex(_v => _v > x);
                if (k < 0)
                    k = c.length;
                const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
                const edge = Math.min(fy, rh - fy, x - x0, x1 - x), n = CForgeTex.Fbm(x / N * 7, y / N * 7, 7, 263), tool = CForgeTex.TNoise2(x / N * 50, y / N * 90, 50, 90, 264);
                if (edge < 1.4)
                    return [0.62 + n * 0.1, 0.05];
                const t = Math.min(1, (edge - 1.4) / 4), bevel = Math.sqrt(t * (2 - t)), tone = 0.86 + CForgeRand.HashF(r, k % c.length, 265) * 0.14;
                const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 2, 3, 266) - 0.6) * 0.5;
                return [tone * (0.93 + bevel * 0.07) + (n - 0.5) * 0.08 + (tool - 0.5) * 0.04 - stain, 0.4 + bevel * 0.45 + (tool - 0.5) * 0.06];
            };
        })(), 7, 0.9, 0.15, 2.6, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sInca, (() => {
            const gx = 4, gy = 4, cw = N / gx, ch = N / gy;
            const P = (_i, _j) => {
                const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
                return [(_i + 0.2 + CForgeRand.HashF(i, j, 271) * 0.6) * cw, (_j + 0.2 + CForgeRand.HashF(i, j, 272) * 0.6) * ch, i, j, 0.75 + CForgeRand.HashF(i, j, 273) * 0.5];
            };
            return (x, y) => {
                const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
                let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
                for (let dj = -2; dj <= 2; dj++)
                    for (let di = -2; di <= 2; di++) {
                        const p = P(ci + di, cj + dj), d = Math.hypot(x - p[0], (y - p[1]) * 1.15) / p[4];
                        if (d < d1) {
                            d2 = d1;
                            d1 = d;
                            bi = p[2];
                            bj = p[3];
                        }
                        else if (d < d2)
                            d2 = d;
                    }
                const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 274), rough = CForgeTex.Fbm(x / N * 24, y / N * 24, 24, 275), edge = (d2 - d1) * 0.5 * 48 / cw;
                if (edge < 1.1)
                    return [0.22 + n * 0.1, 0];
                const t = Math.min(1, (edge - 1.1) / 9), pillow = Math.sqrt(t * (2 - t)), tone = 0.78 + CForgeRand.HashF(bi, bj, 276) * 0.22;
                const lichen = Math.max(0, CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 277) - 0.62) * 0.6;
                return [tone * (0.74 + pillow * 0.26) + (rough - 0.5) * 0.12 - lichen, 0.05 + pillow * 0.9 + (rough - 0.5) * 0.08];
            };
        })(), 12, 0.9, 0.2, 3.4, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sFelt, (x, y) => {
            const u = (x + y) / 32, v = (x - y) / 32, fu = u - Math.floor(u), fv = v - Math.floor(v), seam = Math.min(fu, 1 - fu, fv, 1 - fv) * 32;
            const fib = CForgeTex.Fbm(x / N * 40, y / N * 40, 40, 281), soil = CForgeTex.Fbm(x / N * 2, y / N * 3, 2, 282);
            const stitch = seam < 0.8 && (Math.floor((x + y * 0.5) / 3) % 2 == 0) ? 0.025 : 0, sag = CForgeTex.TNoise2(x / N * 6, y / N * 2, 6, 2, 283);
            return [0.95 + (fib - 0.5) * 0.06 + (sag - 0.5) * 0.06 - Math.max(0, soil - 0.55) * 0.3 - stitch, 0.6 + (sag - 0.5) * 0.3 - (seam < 1.0 ? 0.05 : 0) + (fib - 0.5) * 0.1];
        }, 2, 0.98, 0.05, 1.2, 0);
        CForgeTex.Make(_frame, CForgeTex.sDryCourse, (() => {
            const rows = 16, hs = Array.from({ length: rows }, (_v, _r) => 0.75 + CForgeRand.HashF(_r, 0, 291) * 0.5), hsum = hs.reduce((_a, _b) => _a + _b, 0), y0s = [0];
            for (let r = 0; r < rows; r++)
                y0s.push(y0s[r] + hs[r] / hsum * N);
            const cuts = [];
            for (let r = 0; r < rows; r++) {
                const c = [];
                let x = CForgeRand.HashF(r, 0, 292) * N * 0.2;
                const end = x + N;
                while (end - x > N * 0.08) {
                    c.push(x % N);
                    x += N * (0.1 + CForgeRand.HashF(r, c.length, 293) * 0.14);
                }
                cuts.push(c.sort((_a, _b) => _a - _b));
            }
            return (x, y) => {
                let r = 0;
                while (r < rows - 1 && y >= y0s[r + 1])
                    r++;
                const rh = y0s[r + 1] - y0s[r], fy = y - y0s[r], c = cuts[r];
                let k = c.findIndex(_v => _v > x);
                if (k < 0)
                    k = c.length;
                const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
                const n = CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 294), edge = Math.min(fy, rh - fy, x - x0, x1 - x) + (n - 0.5) * 2.2;
                if (edge < 1.5)
                    return [0.14 + n * 0.1, 0];
                const t = Math.min(1, (edge - 1.5) / 4), bevel = Math.sqrt(t * (2 - t)), tone = 0.72 + CForgeRand.HashF(r, k % c.length, 295) * 0.28;
                return [tone * (0.85 + bevel * 0.15) + (n - 0.5) * 0.14 + (CForgeRand.HashF(x, y, 296) - 0.5) * 0.06, 0.25 + bevel * 0.65 + (n - 0.5) * 0.12];
            };
        })(), 10, 0.92, 0.2, 3.2, 0.04);
        CForgeTex.Make(_frame, CForgeTex.sHiero, (x, y) => {
            const cw = N / 8, ch = N / 10, ci = Math.floor(x / cw), cj = Math.floor(y / ch), fx = x - ci * cw - cw * 0.5, fy = y - cj * ch - ch * 0.5;
            const n = CForgeTex.Fbm(x / N * 7, y / N * 7, 7, 301), rows = (y % (N / 4)) < 1.5;
            if (x % cw < 1.6)
                return [0.62 + n * 0.08, 0.1];
            const g = CForgeRand.Hash(ci, cj, 302) % 9, L = (_x, _y, _w, _h) => Math.max(Math.abs(fx - _x) - _w, Math.abs(fy - _y) - _h);
            const R = (_x, _y, _r) => Math.hypot(fx - _x, fy - _y) - _r;
            let d = 99;
            if (g == 0)
                d = Math.min(L(0, 0, 1.6, 9), R(0, -9, 2.5));
            else if (g == 1)
                d = Math.abs(R(0, 0, 7)) - 1.4;
            else if (g == 2)
                d = Math.abs(fy - Math.sin(fx * 0.6) * 2.5) - 1.3 + (Math.abs(fx) > 11 ? 99 : 0);
            else if (g == 3)
                d = Math.max(R(0, 3, 9), -(fy - 3));
            else if (g == 4)
                d = Math.min(R(2, -6, 3), L(1, 1, 3, 4.5), L(-2, 6, 6, 1.5));
            else if (g == 5)
                d = Math.min(Math.abs(R(0, -5, 3.5)) - 1.2, L(0, 4, 1.3, 6), L(0, 1, 6, 1.2));
            else if (g == 6)
                d = Math.min(Math.abs(Math.hypot(fx / 1.8, fy) - 4) - 1.0, R(0, 0, 1.6));
            else if (g == 7)
                d = Math.min(R(-2, 0, 5), R(4, -4, 2.2), L(6, -4, 3, 0.6), L(-1, 6, 0.8, 3), L(-6, 3, 3, 1.2));
            else
                d = Math.min(L(0, -4, 8, 1.2), L(0, 4, 8, 1.2));
            if (d < 0)
                return [0.58 + n * 0.08 + Math.min(1, -d / 2) * 0.04, 0.12 + Math.max(0, d + 1) * 0.2];
            const rim = d < 1.2 ? (1.2 - d) * 0.05 : 0;
            return [0.92 + (n - 0.5) * 0.12 - (rows ? 0.08 : 0) + rim, 0.6 + (n - 0.5) * 0.15 - (rows ? 0.12 : 0)];
        }, 7, 0.9, 0.15, 2.6, 0.02);
        const m = new Uint8Array(16 * 4);
        for (let i = 0; i < 16; i++) {
            m[i * 4] = 255;
            m[i * 4 + 1] = 0.8 * 255;
            m[i * 4 + 3] = 255;
        }
        CForgeTex.Upload(_frame, CForgeTex.sFlatMat, m, 4);
    }
    static Q(_rgb) { return _rgb.map(_v => Math.max(0, Math.min(255, Math.round(_v * 255)))); }
    static sAO = new Map();
    static MeanAO(_key) {
        let v = CForgeTex.sAO.get(_key);
        if (v != null)
            return v;
        v = 1;
        CForgeTex.Surf(_key);
        const m = CForgeTex.sMatBuf.get(_key);
        if (m != null) {
            let a = 0;
            for (let i = 0; i < m.length; i += 4)
                a += m[i];
            v = a / (m.length / 4) / 255;
        }
        CForgeTex.sAO.set(_key, v);
        return v;
    }
    static sMatBuf = new Map();
    static Tint(_key, _rgb) {
        const q = CForgeTex.Q(_rgb), key = _key.replace(".tex", `_t${q[0]}_${q[1]}_${q[2]}.tex`);
        if (CForgeTex.sFrame.Res().Find(key) != null)
            return key;
        const src = CForgeTex.sBase.get(_key), out = new Uint8Array(src.length);
        for (let i = 0; i < src.length; i += 4) {
            out[i] = src[i] * q[0] / 255;
            out[i + 1] = src[i + 1] * q[1] / 255;
            out[i + 2] = src[i + 2] * q[2] / 255;
            out[i + 3] = 255;
        }
        CForgeTex.Upload(CForgeTex.sFrame, key, out);
        return key;
    }
    static Sign(_text, _aspect, _style = 0) {
        const key = `forge_sign_${encodeURIComponent(_text)}_${Math.round(_aspect * 10)}_${_style}.tex`;
        if (CForgeTex.sFrame.Res().Find(key) != null)
            return key;
        if (typeof document == "undefined")
            return null;
        const N = CForgeTex.sSize, cv = document.createElement("canvas");
        cv.width = cv.height = N;
        const c = cv.getContext("2d");
        if (c == null)
            return null;
        const bx = N * 0.05 / _aspect * 2, by = N * 0.1;
        const pal = _style == 1 ? ["#17130f", "#5a4026", "#2e2117"] : _style == 2 ? ["#7a5a1c", "#c9a23c", "#1d3566"] : ["#3b6b5c", "#b8452e", "#1d1f26"];
        c.fillStyle = pal[0];
        c.fillRect(0, 0, N, N);
        c.fillStyle = pal[1];
        c.fillRect(bx * 0.45, by * 0.45, N - bx * 0.9, N - by * 0.9);
        c.fillStyle = pal[2];
        c.fillRect(bx, by, N - bx * 2, N - by * 2);
        c.save();
        c.scale(1 / _aspect, 1);
        c.fillStyle = "#e3c26a";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = `bold ${Math.round(N * 0.62)}px serif`;
        const w = N * _aspect - bx * _aspect * 2.6, m = c.measureText(_text).width;
        if (m > w)
            c.font = `bold ${Math.round(N * 0.62 * w / m)}px serif`;
        c.fillText(_text, N * _aspect * 0.5, N * 0.53);
        c.restore();
        const buf = new Uint8Array(c.getImageData(0, 0, N, N).data.buffer.slice(0));
        CForgeTex.Upload(CForgeTex.sFrame, key, buf);
        CForgeTex.sBase.set(key, buf);
        return key;
    }
    static Solid(_rgb) {
        const q = CForgeTex.Q(_rgb), key = `forge_solid_${q[0]}_${q[1]}_${q[2]}.tex`;
        if (CForgeTex.sFrame.Res().Find(key) != null)
            return key;
        const out = new Uint8Array(16 * 4);
        for (let i = 0; i < 16; i++) {
            out[i * 4] = q[0];
            out[i * 4 + 1] = q[1];
            out[i * 4 + 2] = q[2];
            out[i * 4 + 3] = 255;
        }
        CForgeTex.Upload(CForgeTex.sFrame, key, out, 4);
        return key;
    }
    static Grain(x, y, _seed) {
        const N = CForgeTex.sSize, T = CForgeTex.TNoise2;
        const warp = (T(x / N * 3, y / N * 2, 3, 2, _seed) - 0.5) * 1.6;
        const line = Math.pow(1 - Math.abs(T(x / N * 28 + warp, y / N * 3, 28, 3, _seed + 1) * 2 - 1), 4);
        const band = T(x / N * 7 + warp * 0.4, y / N, 7, 1, _seed + 2), fine = T(x / N * 90, y / N * 6, 90, 6, _seed + 3);
        const cn = T(x / N * 36 + warp * 0.5, y / N * 2, 36, 2, _seed + 4), crack = cn > 0.86 ? Math.min(1, (cn - 0.86) / 0.06) : 0;
        const kd = CForgeTex.Knot(x, y, 2, 3, 0.35, _seed + 5), knot = kd < 1 ? 1 - kd : 0, ring = 0.5 + 0.5 * Math.sin(kd * 16);
        return [0.84 + (band - 0.5) * 0.22 - line * 0.2 + (fine - 0.5) * 0.08 - crack * 0.35 - knot * (0.25 + 0.15 * ring),
            0.6 + (band - 0.5) * 0.15 - line * 0.22 - crack * 0.45 + (fine - 0.5) * 0.06 + knot * (0.1 - (ring - 0.5) * 0.12)];
    }
    static StoneFn(N) {
        const rows = 6, rh = N / rows, cuts = [];
        for (let r = 0; r < rows; r++) {
            const c = [];
            let x = CForgeRand.HashF(r, 0, 9) * N * 0.3;
            while (x < N + 1) {
                c.push(x);
                x += N * (0.2 + CForgeRand.HashF(r, c.length, 7) * 0.25);
            }
            cuts.push(c.map(_v => _v % N).sort((_a, _b) => _a - _b));
        }
        return (x, y) => {
            const r = Math.floor(y / rh), fy = y - r * rh, c = cuts[r];
            let k = c.findIndex(_v => _v > x);
            if (k < 0)
                k = c.length;
            const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
            const edge = Math.min(fy, rh - fy, x - x0, x1 - x), n = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 13);
            if (edge < 3.5)
                return [0.7 + (n - 0.5) * 0.06, 0.02 + n * 0.06];
            const tone = 0.86 + CForgeRand.HashF(r, k, 21) * 0.14, t = Math.min(1, (edge - 3.5) / 10), bevel = Math.sqrt(t * (2 - t));
            return [tone * (0.92 + bevel * 0.08) + (n - 0.5) * 0.08, 0.3 + bevel * 0.55 + (n - 0.5) * 0.18 + CForgeRand.HashF(r, k, 33) * 0.08];
        };
    }
    static SeongdolFn(N) {
        const rows = 5, hs = Array.from({ length: rows }, (_v, _r) => 0.7 + CForgeRand.HashF(_r, 0, 141) * 0.6), hsum = hs.reduce((_a, _b) => _a + _b, 0);
        const y0s = [0];
        for (let r = 0; r < rows; r++)
            y0s.push(y0s[r] + hs[r] / hsum * N);
        const cuts = [];
        for (let r = 0; r < rows; r++) {
            const c = [];
            let x = CForgeRand.HashF(r, 0, 142) * N * 0.4;
            const end = x + N;
            while (end - x > N * 0.2) {
                c.push({ c: x % N, s: (CForgeRand.HashF(r, c.length, 143) - 0.5) * 0.5, w: CForgeRand.HashF(r, c.length, 144) < 0.45 });
                x += N * (0.22 + CForgeRand.HashF(r, c.length, 145) * 0.26);
            }
            cuts.push(c.sort((_a, _b) => _a.c - _b.c));
        }
        const Wrap = (_d) => _d - Math.round(_d / N) * N;
        return (x, y) => {
            let r = 0;
            while (r < rows - 1 && y >= y0s[r + 1])
                r++;
            const rh = y0s[r + 1] - y0s[r], fy = y - y0s[r], c = cuts[r];
            let dl = Infinity, dr = Infinity, kl = 0, wedge = Infinity;
            for (let k = 0; k < c.length; k++) {
                const cx = c[k].c + c[k].s * (fy - rh * 0.5), d = Wrap(x - cx);
                if (d >= 0 && d < dl) {
                    dl = d;
                    kl = k;
                }
                if (d < 0 && -d < dr)
                    dr = -d;
                if (c[k].w) {
                    const jy = c[k].s > 0 ? 0 : rh, jx = c[k].c + c[k].s * (jy - rh * 0.5);
                    wedge = Math.min(wedge, Math.hypot(Wrap(x - jx), fy - jy));
                }
            }
            const n = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 146), grain = CForgeRand.HashF(x, y, 147), speck = grain > 0.94 ? -0.16 : grain < 0.04 ? 0.08 : 0;
            if (wedge < 7.5) {
                if (wedge > 6)
                    return [0.3, 0.0];
                const t = Math.min(1, (6 - wedge) / 4);
                return [0.82 + speck + (n - 0.5) * 0.1, 0.25 + Math.sqrt(t) * 0.4];
            }
            const edge = Math.min(fy, rh - fy, dl, dr);
            if (edge < 1.6)
                return [0.28 + n * 0.1, 0.0];
            const tone = 0.8 + CForgeRand.HashF(r, kl, 148) * 0.2, t = Math.min(1, (edge - 1.6) / 16), dome = Math.sqrt(t * (2 - t));
            const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 149) - 0.55) * 0.5;
            return [tone * (0.86 + dome * 0.14) + speck + (n - 0.5) * 0.1 - stain, 0.2 + dome * 0.62 + (n - 0.5) * 0.14 + (grain - 0.5) * 0.04];
        };
    }
    static DoldamFn(N) {
        const gx = 7, gy = 8, cw = N / gx, ch = N / gy;
        const P = (_i, _j) => {
            const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
            return [(_i + 0.15 + CForgeRand.HashF(i, j, 151) * 0.7) * cw, (_j + 0.25 + CForgeRand.HashF(i, j, 152) * 0.5) * ch, i, j, 0.65 + CForgeRand.HashF(i, j, 156) * 0.7];
        };
        return (x, y) => {
            const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
            let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
            for (let dj = -2; dj <= 2; dj++)
                for (let di = -2; di <= 2; di++) {
                    const p = P(ci + di, cj + dj), d = Math.hypot((x - p[0]) * 0.8, y - p[1]) / p[4];
                    if (d < d1) {
                        d2 = d1;
                        d1 = d;
                        bi = p[2];
                        bj = p[3];
                    }
                    else if (d < d2)
                        d2 = d;
                }
            const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 153), wob = (CForgeTex.Fbm(x / N * 14, y / N * 14, 14, 157) - 0.5) * 0.25;
            const q = d1 / ((d1 + d2) * 0.5) + wob;
            if (q > 0.84)
                return [0.46 + n * 0.14, 0.02 + n * 0.1];
            const t = Math.min(1, (0.84 - q) / 0.5), dome = Math.sqrt(t * (2 - t)), tone = 0.7 + CForgeRand.HashF(bi, bj, 154) * 0.3;
            return [tone * (0.76 + dome * 0.24) + (n - 0.5) * 0.14 + (CForgeRand.HashF(x, y, 155) - 0.5) * 0.06, 0.12 + dome * 0.8 + (n - 0.5) * 0.1];
        };
    }
    static IshigakiFn(N) {
        const gx = 4, gy = 5, cw = N / gx, ch = N / gy;
        const P = (_i, _j) => {
            const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
            return [(_i + (j % 2) * 0.5 + 0.2 + CForgeRand.HashF(i, j, 181) * 0.6) * cw, (_j + 0.3 + CForgeRand.HashF(i, j, 182) * 0.4) * ch, i, j];
        };
        return (x, y) => {
            const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
            let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
            for (let dj = -2; dj <= 2; dj++)
                for (let di = -2; di <= 2; di++) {
                    const p = P(ci + di, cj + dj), d = Math.hypot(x - p[0], (y - p[1]) * 1.5);
                    if (d < d1) {
                        d2 = d1;
                        d1 = d;
                        bi = p[2];
                        bj = p[3];
                    }
                    else if (d < d2)
                        d2 = d;
                }
            const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 184), rough = CForgeTex.Fbm(x / N * 20, y / N * 20, 20, 185), edge = (d2 - d1) * 0.5;
            if (edge < 2.6)
                return [0.12 + n * 0.1, 0];
            const t = Math.min(1, (edge - 2.6) / 9), bevel = Math.sqrt(t * (2 - t)), tone = 0.55 + CForgeRand.HashF(bi, bj, 186) * 0.45;
            const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 187) - 0.5) * 0.7, crack = CForgeTex.Fbm(x / N * 12, y / N * 12, 12, 188) > 0.72 ? 0.12 : 0;
            return [tone * (0.72 + bevel * 0.28) + (rough - 0.5) * 0.22 - stain - crack, 0.1 + bevel * 0.65 + (rough - 0.5) * 0.35];
        };
    }
    static TileFn(N) {
        const rows = 8, rh = N / rows, tw = N / 10;
        return (x, y) => {
            const r = Math.floor(y / rh), fy = (y - r * rh) / rh, xs = x + (r % 2) * tw * 0.5;
            const k = Math.floor(xs / tw), fx = (xs - k * tw) / tw;
            const tone = 0.86 + CForgeRand.HashF(r, ((k % 10) + 10) % 10, 4) * 0.14;
            const shade = 0.72 + 0.28 * Math.min(1, fy * 2.2);
            const gap = fx < 0.06 || fx > 0.94;
            const h = (gap ? 0.15 : 0.25) + 0.7 * Math.min(1, fy * 1.15) * (gap ? 0.5 : 1);
            return [tone * shade * (gap ? 0.85 : 1) + (CForgeRand.HashF(x, y, 8) - 0.5) * 0.03, h];
        };
    }
    static Make(_frame, _key, _fn, _depth, _rough, _roughVar, _aoStr, _parallax) {
        const N = CForgeTex.sSize, col = new Uint8Array(N * N * 4), hgt = new Float32Array(N * N);
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const [l, h] = _fn(x, y), o = y * N + x, v = Math.max(0, Math.min(1, l)) * 255;
                col[o * 4] = col[o * 4 + 1] = col[o * 4 + 2] = v;
                col[o * 4 + 3] = 255;
                hgt[o] = Math.max(0, Math.min(1, h));
            }
        CForgeTex.Upload(_frame, _key, col);
        CForgeTex.sBase.set(_key, col);
        CForgeTex.sPend.set(_key, () => {
            const nk = _key.replace(".tex", "_n.tex"), mk = _key.replace(".tex", "_m.tex"), nor = CForgeTex.Normal(hgt, N, _depth);
            CForgeTex.Upload(_frame, nk, nor.buf);
            const mat = CForgeTex.Material(hgt, nor.ny, N, _rough, _roughVar, _aoStr);
            CForgeTex.sMatBuf.set(_key, mat);
            CForgeTex.Upload(_frame, mk, mat);
            return new CForgeTexSurf(nk, mk, _parallax);
        });
    }
    static Surf(_key) {
        let s = CForgeTex.sSurf.get(_key);
        if (s == null && CForgeTex.sPend.has(_key)) {
            s = CForgeTex.sPend.get(_key)();
            CForgeTex.sPend.delete(_key);
            CForgeTex.sSurf.set(_key, s);
        }
        return s ?? null;
    }
    static Normal(_h, N, _depth) {
        const H = (_x, _y) => _h[((_y + N) % N) * N + ((_x + N) % N)], out = new Uint8Array(N * N * 4), ny = new Float32Array(N * N);
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * 0.125 * _depth;
                const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * 0.125 * _depth;
                const l = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * N + x) * 4;
                let s = 0;
                for (let k = -1; k <= 1; k++)
                    for (let m = -1; m <= 1; m++)
                        s += H(x + m, y + k);
                ny[y * N + x] = dy * l;
                out[i] = (-dx * l * 0.5 + 0.5) * 255;
                out[i + 1] = (dy * l * 0.5 + 0.5) * 255;
                out[i + 2] = (l * 0.5 + 0.5) * 255;
                out[i + 3] = (0.1 + 0.9 * s / 9) * 255;
            }
        return { buf: out, ny };
    }
    static Material(_h, _ny, N, _rough, _roughVar, _aoStr) {
        const R = 4, H = (_x, _y) => _h[((_y + N) % N) * N + ((_x + N) % N)], out = new Uint8Array(N * N * 4);
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                let s = 0, n = 0;
                for (let k = -R; k <= R; k += 2)
                    for (let m = -R; m <= R; m += 2) {
                        s += H(x + m, y + k);
                        n++;
                    }
                const h = H(x, y), cav = 1 - Math.max(0, s / n - h) * _aoStr, i = (y * N + x) * 4;
                const ao = Math.max(0.25, Math.min(1, cav * (0.92 + _ny[y * N + x] * 0.9)));
                out[i] = ao * 255;
                out[i + 1] = Math.max(0.05, Math.min(1, _rough + (0.5 - h) * _roughVar)) * 255;
                out[i + 2] = 0;
                out[i + 3] = 255;
            }
        return out;
    }
    static Upload(_frame, _key, _buf, N = CForgeTex.sSize) {
        const tex = new CTexture();
        tex.SetSize(N, N);
        tex.CreateBuf();
        tex.GetBuf()[0].set(_buf);
        tex.Set("mFilter", CTexture.eFilter.Linear);
        tex.Set("mMipMap", CTexture.eMipmap.GL);
        tex.Set("mWrap", CTexture.eWrap.Repeat);
        tex.SetAniso(8);
        _frame.Res().Push(_key, tex);
        Promise.resolve(_frame.Ren().BuildTexture(tex)).then(() => { tex.mKeepBuf = false; tex.ReleaseBuf(); });
    }
}
