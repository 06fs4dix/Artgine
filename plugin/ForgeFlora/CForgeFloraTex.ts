import { CTexture } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CForgeRand } from "../ForgeBuild/CForgeRand.js";

export interface IForgeFloraTexCpu { w : number; h : number; buf : Uint8Array; repeat : boolean; }

//코드로 그리는 식생 텍스처. 빌보드를 CPU로 굽기 위해 픽셀 사본을 남긴다.
//버퍼 첫 줄이 이미지 위쪽이고 텍스처 v는 위로 올라간다(v=0이 마지막 줄)
export class CForgeFloraTex
{
    static sGrass = "forgeflora_grass.tex";
    static sLeaf = "forgeflora_leaf.tex";
    static sNeedle = "forgeflora_needle.tex";
    static sBark = "forgeflora_bark.tex";
    static sBarkPine = "forgeflora_barkpine.tex";
    static sRock = "forgeflora_rock.tex";
    //2x2 아틀라스 칸 = 0 데이지 · 1 양귀비 · 2 미나리아재비 · 3 보라꽃
    static sFlower = "forgeflora_flower.tex";
    static sClover = "forgeflora_clover.tex";
    static sFern = "forgeflora_fern.tex";
    //2x2 아틀라스 칸 = 0 수련잎 · 1 밝은 수련잎 · 2 수련꽃 · 3 작은 붉은 잎
    static sLily = "forgeflora_lily.tex";
    static sBamboo = "forgeflora_bamboo.tex";
    static sBambooLeaf = "forgeflora_bambooleaf.tex";
    static sAniso = 8;
    //풀 아틀라스 칸 수(가로). 칸 = 0~4 초록 · 5 연두 · 6 밀짚 · 7 갈대 이삭
    static sGrassCol = 8;
    static sCpu = new Map<string, IForgeFloraTexCpu>();

    static Mat(_key : string) : string { return _key.replace(".tex", "_m.tex"); }
    static Real(_key : string) : string { return _key.replace(".tex", "_r.tex"); }
    static Build(_frame : CFrame, _pbr = false, _real = false)
    {
        if(_frame.Res().Find(CForgeFloraTex.sGrass) != null) { if(_pbr) CForgeFloraTex.Mats(_frame); if(_real) CForgeFloraTex.Reals(_frame); return; }
        CForgeFloraTex.Grass(_frame);
        CForgeFloraTex.Leaf(_frame);
        CForgeFloraTex.Needle(_frame);
        CForgeFloraTex.Bark(_frame, CForgeFloraTex.sBark, [0.42, 0.35, 0.28], 11);
        CForgeFloraTex.Bark(_frame, CForgeFloraTex.sBarkPine, [0.5, 0.33, 0.23], 23);
        CForgeFloraTex.Rock(_frame);
        CForgeFloraTex.Flower(_frame);
        CForgeFloraTex.Clover(_frame);
        CForgeFloraTex.Fern(_frame);
        CForgeFloraTex.Lily(_frame);
        CForgeFloraTex.Bamboo(_frame);
        CForgeFloraTex.BambooLeaf(_frame);
        if(_pbr) CForgeFloraTex.Mats(_frame);
        if(_real) CForgeFloraTex.Reals(_frame);
    }
    //실사는 그린 무늬를 유지한다. 식생 메시에는 노말 칸이 없어, 잎맥·끝·홈의 차이는 재질 거칠기와 AO에만 더한다
    private static Reals(_frame : CFrame)
    {
        const P : [string, number, number, number][] = [
            [CForgeFloraTex.sGrass, 0.86, 0.14, 1], [CForgeFloraTex.sLeaf, 0.78, 0.18, 0], [CForgeFloraTex.sNeedle, 0.82, 0.12, 0],
            [CForgeFloraTex.sBark, 0.9, 0.16, 2], [CForgeFloraTex.sBarkPine, 0.88, 0.16, 2], [CForgeFloraTex.sRock, 0.9, 0.2, 2],
            [CForgeFloraTex.sFlower, 0.76, 0.14, 0], [CForgeFloraTex.sClover, 0.8, 0.14, 0], [CForgeFloraTex.sFern, 0.82, 0.12, 0],
            [CForgeFloraTex.sLily, 0.74, 0.16, 0], [CForgeFloraTex.sBamboo, 0.78, 0.18, 0], [CForgeFloraTex.sBambooLeaf, 0.8, 0.14, 0],
        ];
        for(const [key, rough, v, kind] of P)
        {
            const rk = CForgeFloraTex.Real(key);
            if(_frame.Res().Find(rk) != null) continue;
            const src = CForgeFloraTex.sCpu.get(key);
            if(src == null) continue;
            const out = new Uint8Array(src.buf.length), b = src.buf, w = src.w, h = src.h, n = w * h;
            const lum = new Float32Array(n), low = new Float32Array(n);
            for(let i = 0; i < n; i++) lum[i] = b[i * 4 + 3] < 8 ? 0 : (b[i * 4] + b[i * 4 + 1] + b[i * 4 + 2]) / 765;
            const rad = 2;
            for(let y = 0; y < h; y++)
                for(let x = 0; x < w; x++)
                {
                    let s = 0, c = 0;
                    for(let ky = -rad; ky <= rad; ky++) for(let kx = -rad; kx <= rad; kx++)
                    {
                        const p = ((y + ky + h) % h) * w + (x + kx + w) % w;
                        if(b[p * 4 + 3] < 8) continue;
                        s += lum[p]; c++;
                    }
                    low[y * w + x] = c > 0 ? s / c : lum[y * w + x];
                }
            for(let i = 0; i < n; i++)
            {
                const a = b[i * 4 + 3], o = i * 4;
                out[o + 3] = a;
                if(a < 8) continue;
                const avg = (b[o] + b[o + 1] + b[o + 2]) / 3, sat = 1.12;
                out[o] = Math.max(0, Math.min(255, avg + (b[o] - avg) * sat));
                out[o + 1] = Math.max(0, Math.min(255, avg + (b[o + 1] - avg) * sat));
                out[o + 2] = Math.max(0, Math.min(255, avg + (b[o + 2] - avg) * (sat * 0.96)));
            }
            CForgeFloraTex.Upload(_frame, rk, w, h, out, src.repeat, false);
            const mk = CForgeFloraTex.Mat(rk), orm = new Uint8Array(out.length);
            for(let i = 0; i < n; i++)
            {
                const y = Math.floor(i / w), tip = kind == 1 && y < h * 0.18 ? v * 0.35 : 0;
                const rgh = Math.min(1, Math.max(rough, rough + Math.max(0, 0.5 - lum[i]) * v + Math.abs(lum[i] - low[i]) * v + tip));
                const ao = Math.max(0.58, Math.min(1, 0.72 + lum[i] * 0.28));
                const o = i * 4;
                orm[o] = ao * 255; orm[o + 1] = rgh * 255; orm[o + 2] = 0; orm[o + 3] = 255;
            }
            CForgeFloraTex.Upload(_frame, mk, w, h, orm, src.repeat, false);
        }
    }
    //알베도 밝기를 높이 대신 쓴다. 어두운 홈·잎맥이 더 거칠고 AO가 낮다. 금속은 없다.
    //IBL이 AO를 다시 곱하므로 바닥을 0.62로 둬 식생이 꺼지지 않게 한다
    private static Mats(_frame : CFrame)
    {
        const P : [string, number, number][] = [
            [CForgeFloraTex.sGrass, 0.8, 0.08], [CForgeFloraTex.sLeaf, 0.48, 0.16], [CForgeFloraTex.sNeedle, 0.58, 0.1],
            [CForgeFloraTex.sBark, 0.84, 0.12], [CForgeFloraTex.sBarkPine, 0.78, 0.12], [CForgeFloraTex.sRock, 0.7, 0.18],
            [CForgeFloraTex.sFlower, 0.38, 0.12], [CForgeFloraTex.sClover, 0.58, 0.12], [CForgeFloraTex.sFern, 0.66, 0.1],
            [CForgeFloraTex.sLily, 0.36, 0.14], [CForgeFloraTex.sBamboo, 0.38, 0.16], [CForgeFloraTex.sBambooLeaf, 0.5, 0.12],
        ];
        for(const [key, rough, v] of P)
        {
            const mk = CForgeFloraTex.Mat(key);
            if(_frame.Res().Find(mk) != null) continue;
            const src = CForgeFloraTex.sCpu.get(key);
            if(src == null) continue;
            const out = new Uint8Array(src.buf.length), b = src.buf;
            for(let i = 0; i < b.length; i += 4)
            {
                const lum = (b[i] + b[i + 1] + b[i + 2]) / 765;
                const rgh = Math.max(0.04, Math.min(1, rough + (0.5 - lum) * v));
                const ao = Math.max(0.62, Math.min(1, 0.8 + lum * 0.2));
                out[i] = ao * 255; out[i + 1] = rgh * 255; out[i + 2] = 0; out[i + 3] = 255;
            }
            CForgeFloraTex.Upload(_frame, mk, src.w, src.h, out, src.repeat, false);
        }
    }
    //2x2 아틀라스 칸 _q의 [u0, v0, u1, v1]. 칸 0·1이 이미지 위쪽(v 큰 쪽)
    static Quad(_q : number) : number[]
    {
        const c = _q % 2, r = _q >> 1, m = 0.01;
        return [c * 0.5 + m, (1 - r) * 0.5 + m, c * 0.5 + 0.5 - m, (1 - r) * 0.5 + 0.5 - m];
    }

    //풀 아틀라스 칸 _c 안쪽 u 범위(밉에서 옆 칸 색이 섞이지 않게 가장자리를 비운다)
    static GrassU(_c : number) : number[]
    {
        const w = 1 / CForgeFloraTex.sGrassCol;
        return [(_c + 0.25) * w, (_c + 0.75) * w];
    }

    //풀·잎·빌보드는 AlphaCac 밉(밉마다 컷 기준으로 알파를 다시 구해 멀리서 잎이 사라지거나 경계가 반투명으로 번지지 않게 한다. 정사각만, 아니면 엔진이 말없이 GL 밉으로 만든다).
    //AlphaCac는 밉마다 테두리 1픽셀을 투명으로 비워 반복 텍스처(껍질·돌)는 이음매가 뚫린다. 그래서 그쪽은 GL 밉
    static Upload(_frame : CFrame, _key : string, _w : number, _h : number, _buf : Uint8Array, _repeat : boolean, _keepCpu : boolean = true, _mip : number = CTexture.eMipmap.GL)
    {
        const tex = new CTexture();
        tex.SetSize(_w, _h);
        tex.CreateBuf();
        (tex.GetBuf()[0] as Uint8Array).set(_buf);
        tex.Set("mFilter", CTexture.eFilter.Linear);
        tex.Set("mMipMap", _mip);
        tex.Set("mWrap", _repeat ? CTexture.eWrap.Repeat : CTexture.eWrap.Clamp);
        tex.SetAniso(CForgeFloraTex.sAniso);
        _frame.Res().Push(_key, tex);
        if(_keepCpu) CForgeFloraTex.sCpu.set(_key, { w : _w, h : _h, buf : _buf, repeat : _repeat });
        Promise.resolve(_frame.Ren().BuildTexture(tex)).then(() => { tex.mKeepBuf = false; tex.ReleaseBuf(); });
    }

    //최근접 표본 [r, g, b, a] 0~255
    static Sample(_key : string, _u : number, _v : number) : number[]
    {
        const t = CForgeFloraTex.sCpu.get(_key);
        if(t == null) return [255, 255, 255, 255];
        let x = Math.floor(_u * t.w), y = Math.floor((1 - _v) * t.h);
        if(t.repeat) { x = ((x % t.w) + t.w) % t.w; y = ((y % t.h) + t.h) % t.h; }
        else { x = Math.max(0, Math.min(t.w - 1, x)); y = Math.max(0, Math.min(t.h - 1, y)); }
        const i = (y * t.w + x) * 4;
        return [t.buf[i], t.buf[i + 1], t.buf[i + 2], t.buf[i + 3]];
    }

    //가로·세로 주기를 따로 감는 값 노이즈(반복 텍스처 경계가 이어진다)
    private static TNoise(_x : number, _y : number, _px : number, _py : number, _seed : number) : number
    {
        const xi = Math.floor(_x), yi = Math.floor(_y), xf = _x - xi, yf = _y - yi;
        const H = (_i : number, _j : number) => CForgeRand.HashF(((_i % _px) + _px) % _px, ((_j % _py) + _py) % _py, _seed);
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    private static Fbm(_x : number, _y : number, _px : number, _py : number, _seed : number) : number
    {
        let s = 0, amp = 0.5, n = 0;
        for(let o = 0; o < 4; o++) { const m = 1 << o; s += CForgeFloraTex.TNoise(_x * m, _y * m, _px * m, _py * m, _seed + o) * amp; n += amp; amp *= 0.5; }
        return s / n;
    }
    private static Put(_buf : Uint8Array, _i : number, _rgb : number[], _a : number)
    {
        _buf[_i * 4] = Math.max(0, Math.min(255, _rgb[0] * 255));
        _buf[_i * 4 + 1] = Math.max(0, Math.min(255, _rgb[1] * 255));
        _buf[_i * 4 + 2] = Math.max(0, Math.min(255, _rgb[2] * 255));
        _buf[_i * 4 + 3] = _a;
    }
    //_p에서 선분 _a-_b까지의 거리와 선분 위 비율
    private static SegDist(_px : number, _py : number, _ax : number, _ay : number, _bx : number, _by : number) : number[]
    {
        const dx = _bx - _ax, dy = _by - _ay, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((_px - _ax) * dx + (_py - _ay) * dy) / l2));
        return [Math.hypot(_px - _ax - dx * t, _py - _ay - dy * t), t];
    }

    private static Grass(_frame : CFrame)
    {
        const C = CForgeFloraTex.sGrassCol, cw = 16, W = C * cw, H = 128, buf = new Uint8Array(W * H * 4);
        const col = [[0.34, 0.52, 0.18], [0.3, 0.47, 0.16], [0.4, 0.57, 0.2], [0.27, 0.43, 0.17], [0.36, 0.54, 0.24], [0.55, 0.6, 0.25], [0.82, 0.7, 0.4], [0.38, 0.26, 0.15]];
        for(let y = 0; y < H; y++)
            for(let x = 0; x < W; x++)
            {
                const c = Math.floor(x / cw), lx = (x % cw + 0.5) / cw, t = 1 - (y + 0.5) / H;
                const shade = 0.55 + 0.45 * Math.pow(t, 0.7);
                const vein = 1 + 0.12 * Math.max(0, 1 - Math.abs(lx - 0.5) * 4);
                const streak = 0.9 + 0.2 * CForgeFloraTex.TNoise(x * 0.25, y * 0.08, W * 0.25, H * 0.08, 3);
                let rgb = col[c].map(_v => _v * shade * vein * streak);
                if(c < 6)
                {
                    const tip = Math.max(0, (t - 0.82) / 0.18) * 0.35;
                    rgb = rgb.map((_v, _k) => _v + ([0.72, 0.68, 0.35][_k] - _v) * tip);
                }
                CForgeFloraTex.Put(buf, y * W + x, rgb, 255);
            }
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sGrass, W, H, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //잎 여러 장이 중심에서 퍼진 덩어리. 바탕은 투명이지만 밉에서 테두리가 검게 번지지 않게 잎 평균색을 넣는다
    private static Leaf(_frame : CFrame)
    {
        const N = 256, buf = new Uint8Array(N * N * 4), r = new CForgeRand(77);
        const green = [[0.3, 0.48, 0.17], [0.36, 0.53, 0.2], [0.26, 0.42, 0.15], [0.42, 0.56, 0.22]];
        for(let i = 0; i < N * N; i++) CForgeFloraTex.Put(buf, i, [0.3, 0.46, 0.17], 0);
        const twig = [0.32, 0.24, 0.16];
        const cnt = 18;
        for(let k = 0; k < cnt; k++)
        {
            const ang = r.Range(0, Math.PI * 2), rad = r.Range(0, 46);
            const bx = N / 2 + Math.cos(ang) * rad, by = N / 2 + Math.sin(ang) * rad;
            const da = ang + r.Range(-0.6, 0.6), dx = Math.cos(da), dy = Math.sin(da);
            let len = r.Range(55, 85);
            while(len > 20 && (bx + dx * len < 6 || bx + dx * len > N - 6 || by + dy * len < 6 || by + dy * len > N - 6)) len -= 4;
            const wid = r.Range(0.17, 0.25) * len, base = r.Pick(green), depth = 0.78 + 0.22 * k / (cnt - 1), tone = r.Range(0.9, 1.1);
            const x0 = Math.max(0, Math.floor(Math.min(bx, bx + dx * len) - wid)), x1 = Math.min(N - 1, Math.ceil(Math.max(bx, bx + dx * len) + wid));
            const y0 = Math.max(0, Math.floor(Math.min(by, by + dy * len) - wid)), y1 = Math.min(N - 1, Math.ceil(Math.max(by, by + dy * len) + wid));
            for(let y = y0; y <= y1; y++)
                for(let x = x0; x <= x1; x++)
                {
                    const px = x + 0.5 - bx, py = y + 0.5 - by, t = (px * dx + py * dy) / len, s = -px * dy + py * dx;
                    if(t < 0 || t > 1) continue;
                    const hw = wid * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75);
                    if(Math.abs(s) > hw) continue;
                    const e = Math.abs(s) / (hw || 1);
                    let l = (0.75 + 0.25 * t) * (1 - 0.25 * e * e * e) * depth * tone;
                    if(Math.abs(s) < 1.1) l *= 0.82;
                    CForgeFloraTex.Put(buf, y * N + x, base.map(_v => _v * l), 255);
                }
            const tx0 = Math.floor(Math.min(N / 2, bx)) - 2, tx1 = Math.ceil(Math.max(N / 2, bx)) + 2;
            const ty0 = Math.floor(Math.min(N / 2, by)) - 2, ty1 = Math.ceil(Math.max(N / 2, by)) + 2;
            for(let y = Math.max(0, ty0); y <= Math.min(N - 1, ty1); y++)
                for(let x = Math.max(0, tx0); x <= Math.min(N - 1, tx1); x++)
                {
                    const i = y * N + x;
                    if(buf[i * 4 + 3] != 0) continue;
                    if(CForgeFloraTex.SegDist(x + 0.5, y + 0.5, N / 2, N / 2, bx, by)[0] < 1.4) CForgeFloraTex.Put(buf, i, twig, 255);
                }
        }
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sLeaf, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //바늘잎 가지. 가지가 u 방향(왼쪽 → 오른쪽 끝)으로 v=0.5를 지난다. 카드 u축을 가지 방향에 맞춰 쓴다
    private static Needle(_frame : CFrame)
    {
        const N = 256, buf = new Uint8Array(N * N * 4), r = new CForgeRand(91);
        for(let i = 0; i < N * N; i++) CForgeFloraTex.Put(buf, i, [0.18, 0.32, 0.16], 0);
        const dark = [[0.16, 0.3, 0.15], [0.2, 0.35, 0.17], [0.14, 0.27, 0.14], [0.22, 0.38, 0.2]];
        const Line = (_ax : number, _ay : number, _bx : number, _by : number, _w : number, _rgb : number[], _fade : boolean) =>
        {
            const x0 = Math.max(0, Math.floor(Math.min(_ax, _bx) - _w)), x1 = Math.min(N - 1, Math.ceil(Math.max(_ax, _bx) + _w));
            const y0 = Math.max(0, Math.floor(Math.min(_ay, _by) - _w)), y1 = Math.min(N - 1, Math.ceil(Math.max(_ay, _by) + _w));
            for(let y = y0; y <= y1; y++)
                for(let x = x0; x <= x1; x++)
                {
                    const [d, t] = CForgeFloraTex.SegDist(x + 0.5, y + 0.5, _ax, _ay, _bx, _by);
                    if(d > _w * (_fade ? 1 - 0.6 * t : 1)) continue;
                    CForgeFloraTex.Put(buf, y * N + x, _rgb.map(_v => _v * (_fade ? 0.85 + 0.3 * t : 1)), 255);
                }
        };
        const cy = N / 2;
        //바늘이 1픽셀 남짓이면 밉 몇 단계 만에 알파가 평균돼 알파컷에서 통째로 사라진다. 굵고 촘촘하게 그린다
        for(let x = 3; x < N - 8; x += 3)
        {
            const taper = 1 - 0.45 * x / N;
            for(const side of [-1, 1])
                for(let k = 0; k < 2; k++)
                {
                    const a = r.Range(0.6, 1.2), len = r.Range(80, 118) * taper;
                    const bx = x + Math.cos(a) * len, by = cy + side * Math.sin(a) * len * r.Range(0.8, 1.05);
                    Line(x, cy, Math.min(N - 2, bx), Math.max(2, Math.min(N - 2, by)), 2.3, r.Pick(dark), true);
                }
        }
        Line(0, cy, N - 6, cy, 2.2, [0.36, 0.25, 0.17], false);
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sNeedle, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //세로 골이 진 껍질(u = 둘레, v = 길이). 256 정사각이지만 무늬는 가로를 세로의 절반 비율로 그린다
    private static Bark(_frame : CFrame, _key : string, _rgb : number[], _seed : number)
    {
        const W = 256, H = 256, buf = new Uint8Array(W * H * 4);
        for(let y = 0; y < H; y++)
            for(let x = 0; x < W; x++)
            {
                const n = CForgeFloraTex.Fbm(x / 32, y / 64, W / 32, H / 64, _seed);
                const warp = CForgeFloraTex.Fbm(x / 64, y / 32, W / 64, H / 32, _seed + 7);
                const ridge = Math.abs(Math.sin((x / W * 7 + warp * 1.2) * Math.PI));
                const l = 0.55 + 0.4 * n - 0.4 * Math.pow(1 - ridge, 3);
                CForgeFloraTex.Put(buf, y * W + x, _rgb.map(_v => _v * l * 1.25), 255);
            }
        CForgeFloraTex.Upload(_frame, _key, W, H, buf, true);
    }

    private static Rock(_frame : CFrame)
    {
        const N = 256, buf = new Uint8Array(N * N * 4);
        for(let y = 0; y < N; y++)
            for(let x = 0; x < N; x++)
            {
                const n = CForgeFloraTex.Fbm(x / 32, y / 32, 8, 8, 41);
                const c = Math.abs(CForgeFloraTex.Fbm(x / 64, y / 64, 4, 4, 43) - 0.5);
                const lich = CForgeFloraTex.Fbm(x / 32, y / 32, 8, 8, 47);
                const sp = CForgeRand.HashF(x, y, 49);
                let l = 0.72 + 0.45 * (n - 0.5) + (sp > 0.97 ? 0.12 : sp < 0.03 ? -0.1 : 0);
                if(c < 0.025) l *= 0.7 + 12 * c;
                let rgb = [0.56 * l, 0.55 * l, 0.52 * l];
                if(lich > 0.66) { const m = Math.min(1, (lich - 0.66) * 6) * 0.6; rgb = rgb.map((_v, _k) => _v + ([0.55, 0.56, 0.32][_k] * l - _v) * m); }
                CForgeFloraTex.Put(buf, y * N + x, rgb, 255);
            }
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sRock, N, N, buf, true);
    }

    //바탕을 투명 + 평균색으로 채운 정사각 버퍼(밉에서 테두리가 검게 번지지 않게)
    private static Clear(N : number, _rgb : number[]) : Uint8Array
    {
        const buf = new Uint8Array(N * N * 4);
        for(let i = 0; i < N * N; i++) CForgeFloraTex.Put(buf, i, _rgb, 0);
        return buf;
    }
    //(bx, by)에서 (dx, dy) 방향으로 뻗은 뾰족한 잎 하나. 끝으로 갈수록 밝고 가장자리는 어둡다
    private static DrawLeaf(buf : Uint8Array, N : number, bx : number, by : number, dx : number, dy : number, len : number, wid : number, _rgb : number[], _tone : number)
    {
        const x0 = Math.max(0, Math.floor(Math.min(bx, bx + dx * len) - wid)), x1 = Math.min(N - 1, Math.ceil(Math.max(bx, bx + dx * len) + wid));
        const y0 = Math.max(0, Math.floor(Math.min(by, by + dy * len) - wid)), y1 = Math.min(N - 1, Math.ceil(Math.max(by, by + dy * len) + wid));
        for(let y = y0; y <= y1; y++)
            for(let x = x0; x <= x1; x++)
            {
                const px = x + 0.5 - bx, py = y + 0.5 - by, t = (px * dx + py * dy) / len, s = -px * dy + py * dx;
                if(t < 0 || t > 1) continue;
                const hw = wid * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75);
                if(Math.abs(s) > hw) continue;
                const e = Math.abs(s) / (hw || 1);
                let l = (0.75 + 0.25 * t) * (1 - 0.25 * e * e * e) * _tone;
                if(Math.abs(s) < 1.1) l *= 0.82;
                CForgeFloraTex.Put(buf, y * N + x, _rgb.map(_v => _v * l), 255);
            }
    }
    //(cx, cy) 중심 꽃잎 _n장(꽃잎 길이 _r, 반폭 _pw)과 가운데 원
    private static DrawPetals(buf : Uint8Array, N : number, cx : number, cy : number, _r : number, _n : number, _pw : number, _rgb : number[], _cr : number, _crgb : number[], _rot : number)
    {
        for(let y = Math.max(0, Math.floor(cy - _r)); y <= Math.min(N - 1, Math.ceil(cy + _r)); y++)
            for(let x = Math.max(0, Math.floor(cx - _r)); x <= Math.min(N - 1, Math.ceil(cx + _r)); x++)
            {
                const px = x + 0.5 - cx, py = y + 0.5 - cy, r = Math.hypot(px, py), i = y * N + x;
                if(r < _cr) { CForgeFloraTex.Put(buf, i, _crgb.map(_v => _v * (0.8 + 0.2 * CForgeRand.HashF(x, y, 5))), 255); continue; }
                const step = Math.PI * 2 / _n, a = Math.atan2(py, px) - _rot;
                const da = a - Math.round(a / step) * step, t = r * Math.cos(da), s = r * Math.sin(da), h = _r * 0.5;
                if((t - h) * (t - h) / (h * h) + s * s / (_pw * _pw) > 1) continue;
                CForgeFloraTex.Put(buf, i, _rgb.map(_v => _v * (0.82 + 0.18 * t / _r) * (1 - 0.15 * Math.abs(s) / _pw)), 255);
            }
    }

    private static Flower(_frame : CFrame)
    {
        const N = 256, buf = CForgeFloraTex.Clear(N, [0.75, 0.7, 0.5]), q = N / 4;
        CForgeFloraTex.DrawPetals(buf, N, q, q, 58, 14, 9, [0.97, 0.96, 0.92], 14, [0.95, 0.75, 0.15], 0);
        CForgeFloraTex.DrawPetals(buf, N, q * 3, q, 58, 5, 30, [0.88, 0.16, 0.12], 12, [0.15, 0.1, 0.08], 0.3);
        CForgeFloraTex.DrawPetals(buf, N, q, q * 3, 52, 5, 24, [0.98, 0.85, 0.15], 9, [0.85, 0.6, 0.1], 0.6);
        CForgeFloraTex.DrawPetals(buf, N, q * 3, q * 3, 54, 6, 15, [0.55, 0.35, 0.82], 8, [0.95, 0.9, 0.6], 0.2);
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sFlower, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //세잎 클로버 한 장(하트 잎 셋 + 흰 무늬)
    private static Clover(_frame : CFrame)
    {
        const N = 256, buf = CForgeFloraTex.Clear(N, [0.25, 0.45, 0.18]), c = N / 2;
        for(let k = 0; k < 3; k++)
        {
            const a = -Math.PI / 2 + k * Math.PI * 2 / 3, ax = Math.cos(a), ay = Math.sin(a), lx = c + ax * 50, ly = c + ay * 50;
            for(let y = 0; y < N; y++)
                for(let x = 0; x < N; x++)
                {
                    const px = x + 0.5 - lx, py = y + 0.5 - ly, t = px * ax + py * ay, s = -px * ay + py * ax;
                    const inL = Math.hypot(t - 6, s - 19) < 34 || Math.hypot(t - 6, s + 19) < 34;
                    if(!inL || t < -46) continue;
                    const mark = Math.abs(t + 8 - Math.abs(s) * 0.4) < 3 && Math.abs(s) < 22;
                    const rgb = mark ? [0.62, 0.75, 0.5] : [0.24, 0.47, 0.17].map(_v => _v * (0.85 + 0.15 * (t + 46) / 92));
                    CForgeFloraTex.Put(buf, y * N + x, rgb, 255);
                }
        }
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sClover, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //고사리 잎 한 장. 잎줄기가 v 방향(아래 → 위 끝), 작은 잎은 밑에서 1/4 지점이 가장 길다
    private static Fern(_frame : CFrame)
    {
        const N = 256, buf = CForgeFloraTex.Clear(N, [0.22, 0.4, 0.15]), r = new CForgeRand(61), cx = N / 2;
        for(let y = N - 10; y > 8; y -= 7)
        {
            const t = (N - 10 - y) / (N - 18), L = 112 * Math.min(1, t * 3 + 0.35) * Math.pow(1 - t, 0.7);
            for(const side of [-1, 1])
            {
                const a = 0.38 + r.Range(-0.05, 0.05);
                CForgeFloraTex.DrawLeaf(buf, N, cx, y, side * Math.cos(a), -Math.sin(a), Math.max(6, L), Math.max(5, L * 0.22), [0.26, 0.48, 0.17], r.Range(0.9, 1.05));
            }
        }
        for(let y = 6; y < N - 4; y++)
            for(let x = cx - 2; x <= cx + 2; x++) CForgeFloraTex.Put(buf, y * N + x, [0.3, 0.38, 0.16], 255);
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sFern, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    private static Lily(_frame : CFrame)
    {
        const N = 256, buf = CForgeFloraTex.Clear(N, [0.25, 0.42, 0.18]), q = N / 4;
        const Pad = (cx : number, cy : number, R : number, _rgb : number[], _rot : number) =>
        {
            for(let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
                for(let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++)
                {
                    const px = x + 0.5 - cx, py = y + 0.5 - cy, r = Math.hypot(px, py);
                    if(r > R) continue;
                    let a = Math.atan2(py, px) - _rot;
                    a = Math.atan2(Math.sin(a), Math.cos(a));
                    if(Math.abs(a) < 0.16 && r > 4) continue;
                    const vein = Math.abs(Math.sin(a * 9)) < 0.08 ? 0.86 : 1;
                    CForgeFloraTex.Put(buf, y * N + x, _rgb.map(_v => _v * vein * (0.85 + 0.15 * r / R) * (r > R - 3 ? 0.8 : 1)), 255);
                }
        };
        Pad(q, q, 58, [0.24, 0.45, 0.17], 0.4);
        Pad(q * 3, q, 58, [0.36, 0.55, 0.2], 2.2);
        CForgeFloraTex.DrawPetals(buf, N, q, q * 3, 56, 12, 11, [0.98, 0.86, 0.9], 12, [0.98, 0.82, 0.2], 0.1);
        Pad(q * 3, q * 3, 50, [0.45, 0.3, 0.2], 1.1);
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sLily, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }

    //대나무 줄기(불투명 반복, GL 밉). v가 마디 하나에 0 → 1이 되게 메시 UV를 주면 위아래 끝 띠가 마디 고리가 된다
    private static Bamboo(_frame : CFrame)
    {
        const N = 256, buf = new Uint8Array(N * N * 4);
        for(let y = 0; y < N; y++)
            for(let x = 0; x < N; x++)
            {
                const streak = CForgeFloraTex.Fbm(x / 8, y / 128, N / 8, 2, 71), e = Math.min(y, N - 1 - y);
                let rgb = [0.42, 0.56, 0.22].map(_v => _v * (0.85 + 0.3 * streak));
                if(e < 10) rgb = rgb.map((_v, _k) => _v + ([0.72, 0.7, 0.42][_k] - _v) * (1 - e / 10) * 0.8);
                if(e < 2) rgb = [0.3, 0.32, 0.16];
                CForgeFloraTex.Put(buf, y * N + x, rgb, 255);
            }
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sBamboo, N, N, buf, true);
    }

    //대나무 잎 가지. 가지가 u 방향(왼쪽 → 오른쪽 끝)으로 v=0.5를 지나고 긴 잎이 아래로 처진다
    private static BambooLeaf(_frame : CFrame)
    {
        const N = 256, buf = CForgeFloraTex.Clear(N, [0.32, 0.5, 0.2]), r = new CForgeRand(83), cy = N / 2;
        for(let x = 10; x < N - 30; x += 22)
            for(const side of [-1, 1])
            {
                const a = side < 0 ? r.Range(0.35, 0.7) : r.Range(0.55, 1.0), len = r.Range(70, 105) * (1 - 0.3 * x / N);
                CForgeFloraTex.DrawLeaf(buf, N, x, cy, Math.cos(a), side * Math.sin(a), len, len * 0.17, r.Pick([[0.34, 0.54, 0.2], [0.4, 0.58, 0.22], [0.3, 0.48, 0.18]]), r.Range(0.9, 1.08));
            }
        for(let x = 0; x < N - 20; x++)
            for(let y = cy - 1; y <= cy + 1; y++) CForgeFloraTex.Put(buf, y * N + x, [0.45, 0.5, 0.25], 255);
        CForgeFloraTex.Upload(_frame, CForgeFloraTex.sBambooLeaf, N, N, buf, false, true, CTexture.eMipmap.AlphaCac);
    }
}
