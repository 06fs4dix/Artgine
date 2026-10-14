import { CTexture } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CForgeRand } from "./CForgeRand.js";

//코드로 그리는 반복 텍스처 세트(기본·노말·재질). 기본은 밝기 무늬만 담고(흰색 근처) 색은 부위 색을 곱해 정한다.
//텍스처 한 장이 2m를 덮는다(메시 UV는 m 단위, 페인트에서 0.5배로 줄여 쓴다)
export class CForgeTexSurf
{
    constructor(public mNor : string, public mMat : string, public mParallax : number) {}
}

export class CForgeTex
{
    static sSize = 256;
    static sMeter = 2;
    //엔진 셰이더가 정점 UV에 abs()를 씌워 0을 가로지르는 면은 무늬가 접힌다. 정수만큼 밀어 항상 양수로 둔다(반복 위치는 그대로)
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
    static sSurf = new Map<string, CForgeTexSurf>();
    private static sPend = new Map<string, () => CForgeTexSurf>();
    private static sBase = new Map<string, Uint8Array>();
    private static sFrame : CFrame = null;

    //주기 _p로 이어지는 값 노이즈(타일 경계에서 끊기지 않게 격자 좌표를 주기로 감는다)
    private static TNoise(_x : number, _y : number, _p : number, _seed : number) : number
    {
        const xi = Math.floor(_x), yi = Math.floor(_y), xf = _x - xi, yf = _y - yi;
        const H = (_i : number, _j : number) => CForgeRand.HashF(((_i % _p) + _p) % _p, ((_j % _p) + _p) % _p, _seed);
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    //가로·세로 주기를 따로 감는 값 노이즈. 나뭇결처럼 한 방향으로 늘인 무늬도 타일 위아래가 이어진다(TNoise는 두 축을 같은 주기로 감아 늘이면 이음매가 생긴다)
    private static TNoise2(_x : number, _y : number, _px : number, _py : number, _seed : number) : number
    {
        const xi = Math.floor(_x), yi = Math.floor(_y), xf = _x - xi, yf = _y - yi;
        const H = (_i : number, _j : number) => CForgeRand.HashF(((_i % _px) + _px) % _px, ((_j % _py) + _py) % _py, _seed);
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    //옹이: 격자 칸(_cols×_rows)마다 확률로 하나, 결 방향(세로)으로 길쭉한 타원. 가장 가까운 옹이까지의 정규 거리(1 미만이면 옹이 안)
    private static Knot(_x : number, _y : number, _cols : number, _rows : number, _chance : number, _seed : number) : number
    {
        const N = CForgeTex.sSize, cw = N / _cols, ch = N / _rows, ci = Math.floor(_x / cw), cj = Math.floor(_y / ch);
        let best = 9;
        for(let dj = -1; dj <= 1; dj++)
            for(let di = -1; di <= 1; di++)
            {
                const i = ((ci + di) % _cols + _cols) % _cols, j = ((cj + dj) % _rows + _rows) % _rows;
                if(CForgeRand.HashF(i, j, _seed) > _chance) continue;
                const cx = (ci + di + 0.2 + CForgeRand.HashF(i, j, _seed + 1) * 0.6) * cw, cy = (cj + dj + 0.2 + CForgeRand.HashF(i, j, _seed + 2) * 0.6) * ch;
                const r = 5 + CForgeRand.HashF(i, j, _seed + 3) * 7;
                best = Math.min(best, Math.hypot(_x - cx, (_y - cy) * 0.45) / r);
            }
        return best;
    }
    private static Fbm(_x : number, _y : number, _p : number, _seed : number) : number
    {
        let s = 0, amp = 0.5, n = 0;
        for(let o = 0; o < 4; o++) { s += CForgeTex.TNoise(_x * (1 << o), _y * (1 << o), _p * (1 << o), _seed + o) * amp; n += amp; amp *= 0.5; }
        return s / n;
    }

    static Build(_frame : CFrame)
    {
        CForgeTex.sFrame = _frame;
        if(_frame.Res().Find(CForgeTex.sPlaster) != null) return;
        const N = CForgeTex.sSize;
        CForgeTex.Make(_frame, CForgeTex.sPlaster, (x, y) =>
        {
            const f = CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 11);
            return [0.95 + (f - 0.5) * 0.12 + (CForgeRand.HashF(x, y, 3) - 0.5) * 0.03, 0.5 + (CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 17) - 0.5) * 0.6];
        }, 1.2, 0.92, 0.1, 1.5, 0);
        CForgeTex.Make(_frame, CForgeTex.sStone, CForgeTex.StoneFn(N), 10, 0.9, 0.2, 3, 0.06);
        CForgeTex.Make(_frame, CForgeTex.sTile, CForgeTex.TileFn(N), 9, 0.74, 0.2, 2.5, 0.05);
        //각재(창틀·들보·망루·목책): 결 홈·갈라짐·옹이의 높낮이로 노말과 그늘 AO를 살린다. 조각이 많아 화면을 넓게 덮으므로 패럴랙스는 끈다(성능)
        CForgeTex.Make(_frame, CForgeTex.sWood, (x, y) => CForgeTex.Grain(x, y, 5), 5, 0.9, 0.15, 2.4, 0);
        //납틀 유리: 가로 16px(0.125m)·세로 32px(0.25m) 마름모. 납선은 밝고 거칠게, 유리는 어둡고 매끈하게(거칠기 변화를 음수로 줘 높은 납선이 거칠다)
        CForgeTex.Make(_frame, CForgeTex.sGlass, (x, y) =>
        {
            const u = x / 16 + y / 32, v = x / 16 - y / 32, fu = u - Math.floor(u), fv = v - Math.floor(v);
            const e = Math.min(fu, 1 - fu, fv, 1 - fv) * 16;
            if(e < 1.2) return [0.95, 0.85];
            const sheen = Math.max(0, 1 - Math.abs(((x + y * 0.6) % 128) / 64 - 1) * 3);
            return [0.2 + sheen * 0.1 + (CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 41) - 0.5) * 0.06, 0.3];
        }, 4, 0.35, -0.6, 1, 0);
        //널판: 0.25m 폭 세로 판, 판 사이 홈은 낮고 어둡다. 판마다 밝기를 조금씩 다르게
        CForgeTex.Make(_frame, CForgeTex.sPlank, (x, y) =>
        {
            const pw = N / 8, k = Math.floor(x / pw), fx = x - k * pw;
            if(fx < 2 || fx > pw - 1) return [0.5, 0.05];
            //판마다 결을 다른 자리에서 가져온다(옆 판과 결이 이어지지 않게)
            const bevel = Math.min(1, Math.min(fx - 2, pw - 1 - fx) / 3), [gl, gh] = CForgeTex.Grain(x + k * 37, y + k * 91, 51);
            return [(0.86 + CForgeRand.HashF(k, 0, 52) * 0.14) * (0.92 + bevel * 0.08) * gl / 0.84, 0.3 + bevel * 0.4 + (gh - 0.6) * 0.7];
        }, 6, 0.9, 0.15, 2.4, 0);
        //통나무 벽: 2m에 8단(지름 0.25m). 단면이 둥글어 위아래 가장자리가 어둡고, 통나무 사이 메움 줄은 낮고 밝다
        CForgeTex.Make(_frame, CForgeTex.sLog, (x, y) =>
        {
            const rh = N / 8, r = Math.floor(y / rh), t = (y - r * rh) / rh;
            if(t < 0.05 || t > 0.95) return [0.78, 0.05];
            //통나무는 결이 가로(통나무 축)라 좌표를 바꿔 넣는다
            const h = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) * (t * 2 - 1))), tone = 0.86 + CForgeRand.HashF(r, 0, 62) * 0.14, [gl, gh] = CForgeTex.Grain(y, x, 61);
            return [tone * (0.62 + h * 0.36) * gl / 0.84, 0.12 + h * 0.8 + (gh - 0.6) * 0.35];
        }, 6, 0.92, 0.15, 2.5, 0.04);
        //초가: 2m에 6단으로 짚 다발을 겹쳐 얹는다. 기와처럼 단마다 높이가 크게 올라갔다 다음 단에서 뚝 떨어져야 위·아래를 보는 면이 생겨
        //그늘(노말을 안 보는 환경광)에서도 AO로 단이 살아난다. 짚 줄기는 굵고 약하게(가늘고 세면 노말이 잔물결로 지글거리고 패럴랙스가 흐른다)
        //짚 가닥은 능선 노이즈(1-|2n-1|)로 밝은 가닥과 어두운 틈을 또렷이, 단 끝은 가로 위치마다 흔들어 삐죽삐죽하게(끝은 조금 밝다).
        //단 안의 무늬는 단 안 좌표(t)로만 정해 타일 위아래 이음매가 단 경계 밖으로 나오지 않게 한다
        CForgeTex.Make(_frame, CForgeTex.sThatch, (x, y) =>
        {
            const rows = 6, jag = (CForgeTex.TNoise(x / N * 20, 0.5, 20, 77) - 0.5) * 0.35 + (CForgeTex.TNoise(x / N * 52, 1.5, 52, 78) - 0.5) * 0.15;
            const yy = y / (N / rows) + jag, r = Math.floor(yy), t = yy - r, ri = ((r % rows) + rows) % rows;
            const str = CForgeTex.TNoise(x / N * 80, t * 1.5 + ri * 7.3, 80, 71), str2 = CForgeTex.TNoise(x / N * 36, t * 0.8 + ri * 5.1, 36, 79);
            const ridge = 1 - Math.abs(str * 2 - 1), clump = CForgeTex.Fbm(x / N * 6, t * 0.5 + ri * 1.3, 6, 72);
            const shade = 0.58 + 0.42 * Math.min(1, t * 2.2), tip = t > 0.88 ? (t - 0.88) * 1.5 : 0;
            return [(0.74 + ridge * 0.26 + (str2 - 0.5) * 0.22 + (clump - 0.5) * 0.22 + tip) * shade,
                0.08 + 0.7 * Math.pow(Math.min(1, t * 1.1), 0.8) + ridge * 0.14 + (str2 - 0.5) * 0.08];
        }, 8, 0.95, 0.35, 3, 0.05);
        //너와: 2m에 10단, 단마다 폭이 다른 나무 조각을 엇갈려 붙인다. 아래 끝이 들려 그늘지고 조각 사이는 틈
        CForgeTex.Make(_frame, CForgeTex.sShingle, (x, y) =>
        {
            const rh = N / 10, r = Math.floor(y / rh), t = (y - r * rh) / rh, w = N / 9, xs = x + CForgeRand.HashF(r, 0, 81) * w, k = Math.floor(xs / w), fx = (xs - k * w) / w;
            if(fx < 0.05) return [0.35, 0.05];
            const tone = 0.78 + CForgeRand.HashF(r, k % 9, 82) * 0.22, g = CForgeTex.TNoise(x / N * 40, y / N * 4, 40, 83);
            return [tone * (0.68 + Math.min(1, t * 4) * 0.32) + (g - 0.5) * 0.12, 0.2 + t * 0.65];
        }, 6, 0.9, 0.15, 2.5, 0.04);
        //한식 기와: 2m에 7골. 골마다 둥근 수키와(볼록, 밝음) 줄과 오목한 암키와 골(어둡게)이 번갈아 처마→용마루로 달린다.
        //수키와는 0.33m마다 이음 턱, 암키와는 0.25m마다 겹친 단(아래가 그늘). u = 처마 방향, v = 경사 방향
        CForgeTex.Make(_frame, CForgeTex.sGiwa, (x, y) =>
        {
            const cw = N / 7, k = Math.floor(x / cw), fx = (x - k * cw) / cw, n = (CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 91) - 0.5) * 0.06;
            if(fx > 0.6)
            {
                const t = (fx - 0.6) / 0.4, round = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) * (t * 2 - 1))), seg = (y + CForgeRand.HashF(k, 0, 92) * 20) % (N / 6) / (N / 6);
                const lip = seg > 0.93 ? 0.8 : 1;
                return [(0.55 + round * 0.45) * lip + n, 0.45 + round * 0.55 - (seg > 0.93 ? 0.12 : 0)];
            }
            const t = fx / 0.6, trough = 1 - Math.sin(t * Math.PI) * 0.6, row = (y / (N / 8)) % 1;
            return [(0.5 + 0.18 * trough) * (0.78 + 0.22 * Math.min(1, row * 2.5)) + n, 0.05 + 0.18 * trough + 0.18 * Math.min(1, row * 1.2)];
        }, 9, 0.8, 0.15, 2.8, 0.05);
        //띠살 창호: 한지 바탕(밝음)에 0.06m 간격 세로 살, 2m마다 위·가운데·아래 가로살 세 줄 묶음. 살은 높고 어둡다
        CForgeTex.Make(_frame, CForgeTex.sChangho, (x, y) =>
        {
            const sx = x % 8, fy = y / N, band = [0.08, 0.47, 0.86].some(_b => fy > _b && fy < _b + 0.06 && Math.floor((fy - _b) * N) % 5 < 2);
            const slat = sx < 2 || band, paper = 0.93 + (CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 95) - 0.5) * 0.06;
            return slat ? [0.42, 0.9] : [paper, 0.25];
        }, 5, 0.85, 0.1, 2, 0);
        //한국 초가: 단을 짓지 않고 매끈하게 덮은 볏짚(경사 방향 가는 결) 위에 0.5m 격자로 새끼줄을 매어 누른다. 새끼줄은 높고 조금 어둡다
        CForgeTex.Make(_frame, CForgeTex.sChoga, (x, y) =>
        {
            const g = N / 4, fx = x % g, fy = y % g, rope = Math.min(fx, g - fx, fy, g - fy);
            const str = CForgeTex.TNoise2(x / N * 70, y / N * 5, 70, 5, 97), clump = CForgeTex.Fbm(x / N * 5, y / N * 5, 5, 98);
            if(rope < 2) return [0.62 + (str - 0.5) * 0.1, 0.85 - rope * 0.1];
            return [0.8 + (str - 0.5) * 0.22 + (clump - 0.5) * 0.18, 0.45 + (str - 0.5) * 0.25 + (clump - 0.5) * 0.3 - Math.max(0, 6 - rope) * 0.03];
        }, 5, 0.95, 0.2, 2.2, 0.03);
        CForgeTex.Make(_frame, CForgeTex.sSeongdol, CForgeTex.SeongdolFn(N), 11, 0.88, 0.2, 3.2, 0.05);
        CForgeTex.Make(_frame, CForgeTex.sDoldam, CForgeTex.DoldamFn(N), 12, 0.92, 0.25, 3.5, 0.04);
        //일본 기와(산가와라): 2m에 7골. 한식처럼 수키와·암키와가 따로 줄지지 않고 등과 골이 한 장에 물결로 이어진다. 0.25m마다 겹친 단(위 단 끝 아래가 그늘)
        CForgeTex.Make(_frame, CForgeTex.sKawara, (x, y) =>
        {
            const cw = N / 7, fx = (x % cw) / cw, wave = 0.5 + 0.5 * Math.cos((fx - 0.35) * Math.PI * 2), row = (y / (N / 8)) % 1;
            const n = (CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 161) - 0.5) * 0.05;
            return [(0.62 + wave * 0.32) * (0.72 + 0.28 * Math.min(1, row * 3)) + n, 0.1 + wave * 0.5 + 0.3 * Math.min(1, row * 1.15)];
        }, 8, 0.72, 0.15, 2.6, 0.04);
        //판벽(下見板): 0.2m 가로 판을 아래로 겹쳐 붙인다(판 아래 끝이 두껍고 그 밑 판 윗부분이 그늘). 1m마다 세로 누름대
        CForgeTex.Make(_frame, CForgeTex.sShitami, (x, y) =>
        {
            const t = (y % (N / 10)) / (N / 10), [gl] = CForgeTex.Grain(y, x, 165);
            if(x % (N / 2) < 6) return [0.92 * gl / 0.84, 0.95];
            return [(0.62 + 0.38 * Math.min(1, t * 4)) * gl / 0.84, 0.2 + t * 0.55];
        }, 6, 0.85, 0.15, 2.4, 0.03);
        //격자(格子): 0.0625m마다 세로 살(둥글게 깎음), 살 사이는 안이 비쳐 어둡다. 1m마다 가로 누름살
        CForgeTex.Make(_frame, CForgeTex.sKoshi, (x, y) =>
        {
            const fx = x % 8, [gl] = CForgeTex.Grain(x, y, 167);
            if(y % (N / 2) < 5) return [0.85 * gl / 0.84, 1];
            if(fx >= 5) return [0.12, 0];
            const r = Math.sin((fx + 0.5) / 5 * Math.PI);
            return [(0.7 + r * 0.3) * gl / 0.84, 0.55 + r * 0.4];
        }, 6, 0.85, 0.1, 2.5, 0);
        //장지(障子): 한지 바탕에 0.25m 정사각 격자 살
        CForgeTex.Make(_frame, CForgeTex.sShoji, (x, y) =>
        {
            const paper = 0.94 + (CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 169) - 0.5) * 0.05;
            return x % 32 < 2 || y % 32 < 2 ? [0.55, 0.9] : [paper, 0.3];
        }, 5, 0.85, 0.1, 2, 0);
        //대나무(竹垣): 0.0625m 굵기 대를 세로로 촘촘히. 둥근 면 음영, 대마다 다른 높이에 0.4m 간격 마디
        CForgeTex.Make(_frame, CForgeTex.sTake, (x, y) =>
        {
            const k = Math.floor(x / 8), fx = (x - k * 8) / 8, round = Math.sqrt(Math.max(0, 1 - (fx * 2 - 1) * (fx * 2 - 1)));
            if(fx < 0.1) return [0.25, 0];
            const ny = ((y + CForgeRand.HashF(k, 0, 171) * N) % (N / 5)) / (N / 5), node = ny < 0.04, n = (CForgeTex.TNoise2(x / N * 32, y / N * 2, 32, 2, 172) - 0.5) * 0.08;
            return [(0.58 + round * 0.38) * (node ? 0.85 : 1) + n, 0.2 + round * 0.6 + (node ? 0.18 : 0)];
        }, 6, 0.6, 0.1, 2.4, 0);
        CForgeTex.Make(_frame, CForgeTex.sIshigaki, CForgeTex.IshigakiFn(N), 12, 0.92, 0.2, 3.4, 0.05);
        //일본 억새 지붕(茅葺): 단을 짓지 않고 두껍게 다듬어 덮은 억새. 경사 방향 가는 결 + 큰 뭉치 얼룩
        CForgeTex.Make(_frame, CForgeTex.sKaya, (x, y) =>
        {
            const str = CForgeTex.TNoise2(x / N * 90, y / N * 4, 90, 4, 191), str2 = CForgeTex.TNoise2(x / N * 36, y / N * 2, 36, 2, 192);
            const clump = CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 193), ridge = 1 - Math.abs(str * 2 - 1);
            return [0.7 + ridge * 0.2 + (str2 - 0.5) * 0.15 + (clump - 0.5) * 0.25, 0.4 + ridge * 0.3 + (clump - 0.5) * 0.3];
        }, 6, 0.95, 0.2, 2.4, 0.03);
        //중국 청전(靑磚): 0.4×0.1m 회색 벽돌을 반 장씩 엇갈려 쌓고 밝은 석회 줄눈. 벽돌마다 밝기가 조금씩 다르다
        CForgeTex.Make(_frame, CForgeTex.sQingzhuan, (x, y) =>
        {
            const rh = N / 20, r = Math.floor(y / rh), bw = N / 5, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 5, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 201);
            if(fy < 1.5 || fx < 1.5) return [1.0 + (n - 0.5) * 0.06, 0.1];
            const edge = Math.min(fy - 1.5, rh - fy, fx - 1.5, bw - fx), bevel = Math.min(1, edge / 3);
            return [(0.74 + CForgeRand.HashF(r % 20, k, 202) * 0.22) * (0.9 + bevel * 0.1) + (n - 0.5) * 0.1 + (CForgeRand.HashF(x, y, 203) - 0.5) * 0.04, 0.35 + bevel * 0.5 + (n - 0.5) * 0.1];
        }, 8, 0.9, 0.15, 2.6, 0.03);
        //중국 격자창(窓欞): 0.25m 칸마다 테두리 살 + 안에 마름모 살. 살 사이는 안이 비쳐 어둡다
        CForgeTex.Make(_frame, CForgeTex.sChuang, (x, y) =>
        {
            const fx = x % 32, fy = y % 32, d = Math.abs(fx - 16) + Math.abs(fy - 16), [gl] = CForgeTex.Grain(x, y, 205);
            const bar = fx < 3 || fy < 3 || Math.abs(d - 11) < 1.6;
            return bar ? [0.9 * gl / 0.84, 0.9] : [0.14, 0];
        }, 6, 0.85, 0.1, 2.5, 0);
        //서양 벽돌(영국식 쌓기): 0.22×0.075m 붉은 벽돌을 반 장씩 엇갈려, 밝은 모르타르 줄눈. 벽돌마다 굽기 차이로 색이 다르다
        CForgeTex.Make(_frame, CForgeTex.sBrickWall, (x, y) =>
        {
            const rh = N / 26, r = Math.floor(y / rh), bw = N / 9, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 9, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 12, y / N * 12, 12, 211);
            if(fy < 1.3 || fx < 1.6) return [1.15 + (n - 0.5) * 0.08, 0.15];
            const tone = 0.7 + CForgeRand.HashF(r % 26, k, 212) * 0.3, burn = CForgeRand.HashF(r % 26, k, 213) < 0.12 ? 0.75 : 1;
            return [tone * burn + (n - 0.5) * 0.12 + (CForgeRand.HashF(x, y, 214) - 0.5) * 0.05, 0.5 + (n - 0.5) * 0.2];
        }, 7, 0.9, 0.15, 2.4, 0.02);
        //오르내리창(sash): 0.25m 칸의 흰 창살 격자, 칸 안은 어두운 유리(위쪽이 하늘빛으로 조금 밝다)
        CForgeTex.Make(_frame, CForgeTex.sSash, (x, y) =>
        {
            const fx = x % 32, fy = y % 64;
            if(fx < 3 || fy < 3) return [0.95, 0.9];
            return [0.22 + (1 - fy / 64) * 0.12 + Math.max(0, 1 - Math.abs((fx - fy * 0.5) % 20 - 10) / 3) * 0.08, 0.2];
        }, 4, 0.4, -0.5, 1, 0);
        //잔디 지붕(북유럽 torvtak): 짧은 풀 덤불 얼룩과 드문드문 흙빛
        CForgeTex.Make(_frame, CForgeTex.sTurf, (x, y) =>
        {
            const blade = CForgeTex.TNoise2(x / N * 64, y / N * 24, 64, 24, 221), clump = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 222), soil = CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 223);
            return [0.72 + (blade - 0.5) * 0.3 + (clump - 0.5) * 0.3 - Math.max(0, soil - 0.62) * 0.8, 0.4 + blade * 0.3 + (clump - 0.5) * 0.3];
        }, 5, 0.95, 0.2, 2.4, 0.03);
        //판축 흙(夯土): 0.12m 두께 다진 층이 가로로 쌓이고 층 경계는 조금 어둡고 들어간다. 층마다 흙빛이 조금 다르다
        CForgeTex.Make(_frame, CForgeTex.sHangtu, (x, y) =>
        {
            const rh = N / 16, r = Math.floor(y / rh), fy = (y - r * rh) / rh, n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 231), pit = CForgeRand.HashF(x, y, 232) > 0.985 ? -0.2 : 0;
            const seam = fy < 0.08 ? 0.82 : 1, tone = 0.84 + CForgeRand.HashF(r % 16, 0, 233) * 0.16;
            return [tone * seam + (n - 0.5) * 0.14 + pit, 0.4 + (fy < 0.08 ? -0.3 : 0) + (n - 0.5) * 0.2];
        }, 5, 0.95, 0.2, 2.6, 0.03);
        //흙 미장(사헬·이집트 흙집): 손으로 문질러 바른 흙. 큰 덩이 얼룩과 비스듬한 손자국 결, 빗물이 흘러내린 세로 줄 자국(조금 어둡고 패임), 모래 알갱이와 작은 구멍
        CForgeTex.Make(_frame, CForgeTex.sAdobe, (x, y) =>
        {
            const lump = CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 241), smear = CForgeTex.TNoise2((x + y * 0.6) / N * 18, (y - x * 0.3) / N * 5, 18, 5, 242);
            const rain = Math.max(0, CForgeTex.TNoise2(x / N * 22, y / N * 2, 22, 2, 243) - 0.58) * 0.5, pit = CForgeRand.HashF(x, y, 244) > 0.993 ? -0.2 : 0, grit = (CForgeRand.HashF(x, y, 245) - 0.5) * 0.05;
            return [0.92 + (lump - 0.5) * 0.16 + (smear - 0.5) * 0.1 - rain + pit + grit, 0.5 + (lump - 0.5) * 0.55 + (smear - 0.5) * 0.25 - rain * 0.6 + pit];
        }, 4, 0.95, 0.2, 2.2, 0.02);
        //흙벽돌(이집트): 0.4×0.125m 햇볕에 말린 벽돌을 반 장씩 엇갈려 흙 모르타르로 쌓는다. 모서리가 닳아 둥글고 면에 짚 자국, 벽돌마다 흙빛이 다르다
        CForgeTex.Make(_frame, CForgeTex.sMudBrick, (x, y) =>
        {
            const rh = N / 16, r = Math.floor(y / rh), bw = N / 5, xs = x + (r % 2) * bw * 0.5, k = Math.floor(xs / bw) % 5, fy = y - r * rh, fx = xs - Math.floor(xs / bw) * bw;
            const n = CForgeTex.Fbm(x / N * 9, y / N * 9, 9, 251), straw = CForgeTex.TNoise2(x / N * 60, y / N * 20, 60, 20, 252);
            const edge = Math.min(fy, rh - fy, fx, bw - fx) + (n - 0.5) * 2.5;
            if(edge < 2) return [0.72 + (n - 0.5) * 0.1, 0.08];
            const t = Math.min(1, (edge - 2) / 6), bevel = Math.sqrt(t * (2 - t)), tone = 0.82 + CForgeRand.HashF(r % 16, k, 253) * 0.18;
            return [tone * (0.9 + bevel * 0.1) + (n - 0.5) * 0.12 + (straw > 0.82 ? 0.06 : 0), 0.3 + bevel * 0.5 + (n - 0.5) * 0.2];
        }, 6, 0.95, 0.2, 2.6, 0.03);
        //마름돌(이집트 신전·맘루크 석조): 2m에 4단(0.5m), 단마다 0.7~1.5m 긴 돌을 엇갈려 얇은 줄눈으로 맞댄다. 면은 평평하고 정 자국 잔결, 모서리만 조금 깎인다
        CForgeTex.Make(_frame, CForgeTex.sAshlar, (() =>
        {
            const rows = 4, rh = N / rows, cuts : number[][] = [];
            for(let r = 0; r < rows; r++)
            {
                const c : number[] = [];
                let x = CForgeRand.HashF(r, 0, 261) * N * 0.5;
                const end = x + N;
                while(end - x > N * 0.3) { c.push(x % N); x += N * (0.35 + CForgeRand.HashF(r, c.length, 262) * 0.4); }
                cuts.push(c.sort((_a, _b) => _a - _b));
            }
            return (x : number, y : number) =>
            {
                const r = Math.floor(y / rh), fy = y - r * rh, c = cuts[r];
                let k = c.findIndex(_v => _v > x);
                if(k < 0) k = c.length;
                const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
                const edge = Math.min(fy, rh - fy, x - x0, x1 - x), n = CForgeTex.Fbm(x / N * 7, y / N * 7, 7, 263), tool = CForgeTex.TNoise2(x / N * 50, y / N * 90, 50, 90, 264);
                if(edge < 1.4) return [0.62 + n * 0.1, 0.05];
                const t = Math.min(1, (edge - 1.4) / 4), bevel = Math.sqrt(t * (2 - t)), tone = 0.86 + CForgeRand.HashF(r, k % c.length, 265) * 0.14;
                const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 2, 3, 266) - 0.6) * 0.5;
                return [tone * (0.93 + bevel * 0.07) + (n - 0.5) * 0.08 + (tool - 0.5) * 0.04 - stain, 0.4 + bevel * 0.45 + (tool - 0.5) * 0.06];
            };
        })(), 7, 0.9, 0.15, 2.6, 0.03);
        //잉카 다각형 맞춤돌(쿠스코 석벽): 크기가 제각각인 여러 각 돌이 모르타르 없이 꼭 맞물린다. 줄눈은 아주 가늘고 돌 면은 베개처럼 볼록하게 부풀어 가장자리가 둥글게 들어간다
        CForgeTex.Make(_frame, CForgeTex.sInca, (() =>
        {
            const gx = 4, gy = 4, cw = N / gx, ch = N / gy;
            const P = (_i : number, _j : number) =>
            {
                const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
                return [(_i + 0.2 + CForgeRand.HashF(i, j, 271) * 0.6) * cw, (_j + 0.2 + CForgeRand.HashF(i, j, 272) * 0.6) * ch, i, j, 0.75 + CForgeRand.HashF(i, j, 273) * 0.5];
            };
            return (x : number, y : number) =>
            {
                const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
                let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
                for(let dj = -2; dj <= 2; dj++)
                    for(let di = -2; di <= 2; di++)
                    {
                        const p = P(ci + di, cj + dj), d = Math.hypot(x - p[0], (y - p[1]) * 1.15) / p[4];
                        if(d < d1) { d2 = d1; d1 = d; bi = p[2]; bj = p[3]; } else if(d < d2) d2 = d;
                    }
                const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 274), rough = CForgeTex.Fbm(x / N * 24, y / N * 24, 24, 275), edge = (d2 - d1) * 0.5 * 48 / cw;
                if(edge < 1.1) return [0.22 + n * 0.1, 0];
                const t = Math.min(1, (edge - 1.1) / 9), pillow = Math.sqrt(t * (2 - t)), tone = 0.78 + CForgeRand.HashF(bi, bj, 276) * 0.22;
                const lichen = Math.max(0, CForgeTex.Fbm(x / N * 4, y / N * 4, 4, 277) - 0.62) * 0.6;
                return [tone * (0.74 + pillow * 0.26) + (rough - 0.5) * 0.12 - lichen, 0.05 + pillow * 0.9 + (rough - 0.5) * 0.08];
            };
        })(), 12, 0.9, 0.2, 3.4, 0.05);
        //펠트(게르 덮개): 매끈한 양털 천에 0.25m 마름모 누빔 바늘땀이 얕게 들어가고, 큰 얼룩으로 때가 탄다
        CForgeTex.Make(_frame, CForgeTex.sFelt, (x, y) =>
        {
            const u = (x + y) / 32, v = (x - y) / 32, fu = u - Math.floor(u), fv = v - Math.floor(v), seam = Math.min(fu, 1 - fu, fv, 1 - fv) * 32;
            const fib = CForgeTex.Fbm(x / N * 40, y / N * 40, 40, 281), soil = CForgeTex.Fbm(x / N * 2, y / N * 3, 2, 282);
            const stitch = seam < 0.8 && (Math.floor((x + y * 0.5) / 3) % 2 == 0) ? 0.025 : 0, sag = CForgeTex.TNoise2(x / N * 6, y / N * 2, 6, 2, 283);
            return [0.95 + (fib - 0.5) * 0.06 + (sag - 0.5) * 0.06 - Math.max(0, soil - 0.55) * 0.3 - stitch, 0.6 + (sag - 0.5) * 0.3 - (seam < 1.0 ? 0.05 : 0) + (fib - 0.5) * 0.1];
        }, 2, 0.98, 0.05, 1.2, 0);
        //건식 석축(그레이트 짐바브웨): 0.1~0.16m 높이로 얇게 쪼갠 화강암을 모르타르 없이 가로로 길게 쌓는다. 틈은 어둡고 깊고, 돌마다 길이·밝기가 다르다
        CForgeTex.Make(_frame, CForgeTex.sDryCourse, (() =>
        {
            const rows = 16, hs = Array.from({ length : rows }, (_v, _r) => 0.75 + CForgeRand.HashF(_r, 0, 291) * 0.5), hsum = hs.reduce((_a, _b) => _a + _b, 0), y0s = [0];
            for(let r = 0; r < rows; r++) y0s.push(y0s[r] + hs[r] / hsum * N);
            const cuts : number[][] = [];
            for(let r = 0; r < rows; r++)
            {
                const c : number[] = [];
                let x = CForgeRand.HashF(r, 0, 292) * N * 0.2;
                const end = x + N;
                while(end - x > N * 0.08) { c.push(x % N); x += N * (0.1 + CForgeRand.HashF(r, c.length, 293) * 0.14); }
                cuts.push(c.sort((_a, _b) => _a - _b));
            }
            return (x : number, y : number) =>
            {
                let r = 0;
                while(r < rows - 1 && y >= y0s[r + 1]) r++;
                const rh = y0s[r + 1] - y0s[r], fy = y - y0s[r], c = cuts[r];
                let k = c.findIndex(_v => _v > x);
                if(k < 0) k = c.length;
                const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
                const n = CForgeTex.Fbm(x / N * 10, y / N * 10, 10, 294), edge = Math.min(fy, rh - fy, x - x0, x1 - x) + (n - 0.5) * 2.2;
                if(edge < 1.5) return [0.14 + n * 0.1, 0];
                const t = Math.min(1, (edge - 1.5) / 4), bevel = Math.sqrt(t * (2 - t)), tone = 0.72 + CForgeRand.HashF(r, k % c.length, 295) * 0.28;
                return [tone * (0.85 + bevel * 0.15) + (n - 0.5) * 0.14 + (CForgeRand.HashF(x, y, 296) - 0.5) * 0.06, 0.25 + bevel * 0.65 + (n - 0.5) * 0.12];
            };
        })(), 10, 0.92, 0.2, 3.2, 0.04);
        //상형문자 부조(이집트 신전·탑문 벽): 0.25m 폭 세로 단을 새김 선으로 가르고, 칸마다 글자(갈대 잎·고리·물결·빵·앉은 사람·앙크·눈·새)를
        //음각으로 판다. 새긴 홈은 낮고 어둡고, 바탕은 사암 마름돌(얕은 가로 줄눈)
        CForgeTex.Make(_frame, CForgeTex.sHiero, (x, y) =>
        {
            const cw = N / 8, ch = N / 10, ci = Math.floor(x / cw), cj = Math.floor(y / ch), fx = x - ci * cw - cw * 0.5, fy = y - cj * ch - ch * 0.5;
            const n = CForgeTex.Fbm(x / N * 7, y / N * 7, 7, 301), rows = (y % (N / 4)) < 1.5;
            if(x % cw < 1.6) return [0.62 + n * 0.08, 0.1];
            const g = CForgeRand.Hash(ci, cj, 302) % 9, L = (_x : number, _y : number, _w : number, _h : number) => Math.max(Math.abs(fx - _x) - _w, Math.abs(fy - _y) - _h);
            const R = (_x : number, _y : number, _r : number) => Math.hypot(fx - _x, fy - _y) - _r;
            let d = 99;
            if(g == 0) d = Math.min(L(0, 0, 1.6, 9), R(0, -9, 2.5));
            else if(g == 1) d = Math.abs(R(0, 0, 7)) - 1.4;
            else if(g == 2) d = Math.abs(fy - Math.sin(fx * 0.6) * 2.5) - 1.3 + (Math.abs(fx) > 11 ? 99 : 0);
            else if(g == 3) d = Math.max(R(0, 3, 9), -(fy - 3));
            else if(g == 4) d = Math.min(R(2, -6, 3), L(1, 1, 3, 4.5), L(-2, 6, 6, 1.5));
            else if(g == 5) d = Math.min(Math.abs(R(0, -5, 3.5)) - 1.2, L(0, 4, 1.3, 6), L(0, 1, 6, 1.2));
            else if(g == 6) d = Math.min(Math.abs(Math.hypot(fx / 1.8, fy) - 4) - 1.0, R(0, 0, 1.6));
            else if(g == 7) d = Math.min(R(-2, 0, 5), R(4, -4, 2.2), L(6, -4, 3, 0.6), L(-1, 6, 0.8, 3), L(-6, 3, 3, 1.2));
            else d = Math.min(L(0, -4, 8, 1.2), L(0, 4, 8, 1.2));
            if(d < 0) return [0.58 + n * 0.08 + Math.min(1, -d / 2) * 0.04, 0.12 + Math.max(0, d + 1) * 0.2];
            const rim = d < 1.2 ? (1.2 - d) * 0.05 : 0;
            return [0.92 + (n - 0.5) * 0.12 - (rows ? 0.08 : 0) + rim, 0.6 + (n - 0.5) * 0.15 - (rows ? 0.12 : 0)];
        }, 7, 0.9, 0.15, 2.6, 0.02);
        const m = new Uint8Array(16 * 4);
        for(let i = 0; i < 16; i++) { m[i * 4] = 255; m[i * 4 + 1] = 0.8 * 255; m[i * 4 + 3] = 255; }
        CForgeTex.Upload(_frame, CForgeTex.sFlatMat, m, 4);
    }

    private static Q(_rgb : number[]) : number[] { return _rgb.map(_v => Math.max(0, Math.min(255, Math.round(_v * 255)))); }
    private static sAO = new Map<string, number>();
    //재질맵 AO(R)의 평균. 멀리서 재질맵을 빼고 그릴 때 색에 곱해 밝기를 맞춘다
    static MeanAO(_key : string) : number
    {
        let v = CForgeTex.sAO.get(_key);
        if(v != null) return v;
        v = 1;
        CForgeTex.Surf(_key);
        const m = CForgeTex.sMatBuf.get(_key);
        if(m != null) { let a = 0; for(let i = 0; i < m.length; i += 4) a += m[i]; v = a / (m.length / 4) / 255; }
        CForgeTex.sAO.set(_key, v);
        return v;
    }
    private static sMatBuf = new Map<string, Uint8Array>();
    //기본 텍스처(밝기 무늬)에 부위 색을 곱한 사본. 여러 집을 한 메시로 합칠 때 색을 페인트 대신 텍스처로 나눈다
    static Tint(_key : string, _rgb : number[]) : string
    {
        const q = CForgeTex.Q(_rgb), key = _key.replace(".tex", `_t${q[0]}_${q[1]}_${q[2]}.tex`);
        if(CForgeTex.sFrame.Res().Find(key) != null) return key;
        const src = CForgeTex.sBase.get(_key), out = new Uint8Array(src.length);
        for(let i = 0; i < src.length; i += 4)
        {
            out[i] = src[i] * q[0] / 255; out[i + 1] = src[i + 1] * q[1] / 255; out[i + 2] = src[i + 2] * q[2] / 255; out[i + 3] = 255;
        }
        CForgeTex.Upload(CForgeTex.sFrame, key, out);
        return key;
    }
    //글씨 현판(색이 구워진 텍스처, 부위 색은 흰색으로 둔다). 가로:세로 = _aspect인 판에 0~1 UV로 붙인다 — 정사각 텍스처에 가로로 눌러 그려 늘어나도 글자 비율이 맞다.
    //_style 0 = 한국(녹색·주홍 테두리에 검은 바탕), 1 = 일본(검은 테두리에 짙은 나무 바탕), 2 = 중국(금 테두리에 파란 바탕). 캔버스가 없는 환경이면 null
    static Sign(_text : string, _aspect : number, _style : number = 0) : string
    {
        const key = `forge_sign_${encodeURIComponent(_text)}_${Math.round(_aspect * 10)}_${_style}.tex`;
        if(CForgeTex.sFrame.Res().Find(key) != null) return key;
        if(typeof document == "undefined") return null;
        const N = CForgeTex.sSize, cv = document.createElement("canvas");
        cv.width = cv.height = N;
        const c = cv.getContext("2d");
        if(c == null) return null;
        const bx = N * 0.05 / _aspect * 2, by = N * 0.1;
        const pal = _style == 1 ? ["#17130f", "#5a4026", "#2e2117"] : _style == 2 ? ["#7a5a1c", "#c9a23c", "#1d3566"] : ["#3b6b5c", "#b8452e", "#1d1f26"];
        c.fillStyle = pal[0]; c.fillRect(0, 0, N, N);
        c.fillStyle = pal[1]; c.fillRect(bx * 0.45, by * 0.45, N - bx * 0.9, N - by * 0.9);
        c.fillStyle = pal[2]; c.fillRect(bx, by, N - bx * 2, N - by * 2);
        c.save();
        c.scale(1 / _aspect, 1);
        c.fillStyle = "#e3c26a";
        c.textAlign = "center"; c.textBaseline = "middle";
        c.font = `bold ${Math.round(N * 0.62)}px serif`;
        const w = N * _aspect - bx * _aspect * 2.6, m = c.measureText(_text).width;
        if(m > w) c.font = `bold ${Math.round(N * 0.62 * w / m)}px serif`;
        c.fillText(_text, N * _aspect * 0.5, N * 0.53);
        c.restore();
        const buf = new Uint8Array(c.getImageData(0, 0, N, N).data.buffer.slice(0));
        CForgeTex.Upload(CForgeTex.sFrame, key, buf);
        CForgeTex.sBase.set(key, buf);
        return key;
    }
    //텍스처 없는 부위(색만 있는 잎·철물 등)용 단색
    static Solid(_rgb : number[]) : string
    {
        const q = CForgeTex.Q(_rgb), key = `forge_solid_${q[0]}_${q[1]}_${q[2]}.tex`;
        if(CForgeTex.sFrame.Res().Find(key) != null) return key;
        const out = new Uint8Array(16 * 4);
        for(let i = 0; i < 16; i++) { out[i * 4] = q[0]; out[i * 4 + 1] = q[1]; out[i * 4 + 2] = q[2]; out[i * 4 + 3] = 255; }
        CForgeTex.Upload(CForgeTex.sFrame, key, out, 4);
        return key;
    }

    //나뭇결(결 방향 = 세로 v) → [밝기, 높이]. 물결치는 가는 결선은 홈(어둡고 낮게), 넓은 나이테 띠, 잔결, 가는 갈라짐, 옹이(동심 테).
    //그늘의 환경광은 노말을 안 보므로 홈·갈라짐·옹이를 깊게 파 재질맵 AO로도 결이 보이게 한다
    private static Grain(x : number, y : number, _seed : number) : number[]
    {
        const N = CForgeTex.sSize, T = CForgeTex.TNoise2;
        const warp = (T(x / N * 3, y / N * 2, 3, 2, _seed) - 0.5) * 1.6;
        const line = Math.pow(1 - Math.abs(T(x / N * 28 + warp, y / N * 3, 28, 3, _seed + 1) * 2 - 1), 4);
        const band = T(x / N * 7 + warp * 0.4, y / N, 7, 1, _seed + 2), fine = T(x / N * 90, y / N * 6, 90, 6, _seed + 3);
        const cn = T(x / N * 36 + warp * 0.5, y / N * 2, 36, 2, _seed + 4), crack = cn > 0.86 ? Math.min(1, (cn - 0.86) / 0.06) : 0;
        const kd = CForgeTex.Knot(x, y, 2, 3, 0.35, _seed + 5), knot = kd < 1 ? 1 - kd : 0, ring = 0.5 + 0.5 * Math.sin(kd * 16);
        return [0.84 + (band - 0.5) * 0.22 - line * 0.2 + (fine - 0.5) * 0.08 - crack * 0.35 - knot * (0.25 + 0.15 * ring),
            0.6 + (band - 0.5) * 0.15 - line * 0.22 - crack * 0.45 + (fine - 0.5) * 0.06 + knot * (0.1 - (ring - 0.5) * 0.12)];
    }
    //돌 쌓기: 2m 높이에 6단, 단마다 폭이 다른 돌을 엇갈려 쌓는다. 줄눈은 깊고 어둡고, 돌 가장자리는 둥글게 깎인다
    private static StoneFn(N : number) : (_x : number, _y : number) => number[]
    {
        const rows = 6, rh = N / rows, cuts : number[][] = [];
        for(let r = 0; r < rows; r++)
        {
            const c : number[] = [];
            let x = CForgeRand.HashF(r, 0, 9) * N * 0.3;
            while(x < N + 1) { c.push(x); x += N * (0.2 + CForgeRand.HashF(r, c.length, 7) * 0.25); }
            cuts.push(c.map(_v => _v % N).sort((_a, _b) => _a - _b));
        }
        return (x, y) =>
        {
            const r = Math.floor(y / rh), fy = y - r * rh, c = cuts[r];
            let k = c.findIndex(_v => _v > x);
            if(k < 0) k = c.length;
            const x0 = k == 0 ? c[c.length - 1] - N : c[k - 1], x1 = k == c.length ? c[0] + N : c[k];
            const edge = Math.min(fy, rh - fy, x - x0, x1 - x), n = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 13);
            if(edge < 3.5) return [0.7 + (n - 0.5) * 0.06, 0.02 + n * 0.06];
            const tone = 0.86 + CForgeRand.HashF(r, k, 21) * 0.14, t = Math.min(1, (edge - 3.5) / 10), bevel = Math.sqrt(t * (2 - t));
            return [tone * (0.92 + bevel * 0.08) + (n - 0.5) * 0.08, 0.3 + bevel * 0.55 + (n - 0.5) * 0.18 + CForgeRand.HashF(r, k, 33) * 0.08];
        };
    }
    //한국 성돌(화강암 짜맞춤): 2m에 높이가 제각각인 5단, 단마다 폭 0.45~1.2m의 넓적한 돌. 옆 줄눈이 기울어 사다리꼴로 맞물리고,
    //모르타르 없이 쌓아 틈은 좁고 깊다. 줄눈이 만나는 모서리 몇 곳에는 작은 쐐기돌. 면은 볼록하게 부풀고 화강암 반점·얼룩
    private static SeongdolFn(N : number) : (_x : number, _y : number) => number[]
    {
        const rows = 5, hs = Array.from({ length : rows }, (_v, _r) => 0.7 + CForgeRand.HashF(_r, 0, 141) * 0.6), hsum = hs.reduce((_a, _b) => _a + _b, 0);
        const y0s : number[] = [0];
        for(let r = 0; r < rows; r++) y0s.push(y0s[r] + hs[r] / hsum * N);
        const cuts : { c : number, s : number, w : boolean }[][] = [];
        for(let r = 0; r < rows; r++)
        {
            const c : { c : number, s : number, w : boolean }[] = [];
            let x = CForgeRand.HashF(r, 0, 142) * N * 0.4;
            const end = x + N;
            while(end - x > N * 0.2)
            {
                c.push({ c : x % N, s : (CForgeRand.HashF(r, c.length, 143) - 0.5) * 0.5, w : CForgeRand.HashF(r, c.length, 144) < 0.45 });
                x += N * (0.22 + CForgeRand.HashF(r, c.length, 145) * 0.26);
            }
            cuts.push(c.sort((_a, _b) => _a.c - _b.c));
        }
        const Wrap = (_d : number) => _d - Math.round(_d / N) * N;
        return (x, y) =>
        {
            let r = 0;
            while(r < rows - 1 && y >= y0s[r + 1]) r++;
            const rh = y0s[r + 1] - y0s[r], fy = y - y0s[r], c = cuts[r];
            //기운 줄눈: 단 가운데 기준으로 기울기만큼 x를 민다. 가장 가까운 왼쪽·오른쪽 줄눈을 찾는다
            let dl = Infinity, dr = Infinity, kl = 0, wedge = Infinity;
            for(let k = 0; k < c.length; k++)
            {
                const cx = c[k].c + c[k].s * (fy - rh * 0.5), d = Wrap(x - cx);
                if(d >= 0 && d < dl) { dl = d; kl = k; }
                if(d < 0 && -d < dr) dr = -d;
                if(c[k].w)
                {
                    const jy = c[k].s > 0 ? 0 : rh, jx = c[k].c + c[k].s * (jy - rh * 0.5);
                    wedge = Math.min(wedge, Math.hypot(Wrap(x - jx), fy - jy));
                }
            }
            const n = CForgeTex.Fbm(x / N * 6, y / N * 6, 6, 146), grain = CForgeRand.HashF(x, y, 147), speck = grain > 0.94 ? -0.16 : grain < 0.04 ? 0.08 : 0;
            if(wedge < 7.5)
            {
                if(wedge > 6) return [0.3, 0.0];
                const t = Math.min(1, (6 - wedge) / 4);
                return [0.82 + speck + (n - 0.5) * 0.1, 0.25 + Math.sqrt(t) * 0.4];
            }
            const edge = Math.min(fy, rh - fy, dl, dr);
            if(edge < 1.6) return [0.28 + n * 0.1, 0.0];
            const tone = 0.8 + CForgeRand.HashF(r, kl, 148) * 0.2, t = Math.min(1, (edge - 1.6) / 16), dome = Math.sqrt(t * (2 - t));
            const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 149) - 0.55) * 0.5;
            return [tone * (0.86 + dome * 0.14) + speck + (n - 0.5) * 0.1 - stain, 0.2 + dome * 0.62 + (n - 0.5) * 0.14 + (grain - 0.5) * 0.04];
        };
    }
    //막돌(돌담·초가 기단): 크기가 제각각인 둥근 자연석을 흙으로 메워 쌓는다. 지터 격자 셀마다 돌 하나(셀마다 크기 배율이 달라 큰 돌이 작은 돌을 밀어낸다).
    //돌 중심에서 경계까지의 비율로 둥근 돌을 만들어 모서리는 흙으로 메운다. 가장자리는 윤곽 노이즈로 울퉁불퉁하게
    private static DoldamFn(N : number) : (_x : number, _y : number) => number[]
    {
        const gx = 7, gy = 8, cw = N / gx, ch = N / gy;
        const P = (_i : number, _j : number) =>
        {
            const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
            return [(_i + 0.15 + CForgeRand.HashF(i, j, 151) * 0.7) * cw, (_j + 0.25 + CForgeRand.HashF(i, j, 152) * 0.5) * ch, i, j, 0.65 + CForgeRand.HashF(i, j, 156) * 0.7];
        };
        return (x, y) =>
        {
            const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
            let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
            for(let dj = -2; dj <= 2; dj++)
                for(let di = -2; di <= 2; di++)
                {
                    const p = P(ci + di, cj + dj), d = Math.hypot((x - p[0]) * 0.8, y - p[1]) / p[4];
                    if(d < d1) { d2 = d1; d1 = d; bi = p[2]; bj = p[3]; } else if(d < d2) d2 = d;
                }
            const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 153), wob = (CForgeTex.Fbm(x / N * 14, y / N * 14, 14, 157) - 0.5) * 0.25;
            const q = d1 / ((d1 + d2) * 0.5) + wob;
            if(q > 0.84) return [0.46 + n * 0.14, 0.02 + n * 0.1];
            const t = Math.min(1, (0.84 - q) / 0.5), dome = Math.sqrt(t * (2 - t)), tone = 0.7 + CForgeRand.HashF(bi, bj, 154) * 0.3;
            return [tone * (0.76 + dome * 0.24) + (n - 0.5) * 0.14 + (CForgeRand.HashF(x, y, 155) - 0.5) * 0.06, 0.12 + dome * 0.8 + (n - 0.5) * 0.1];
        };
    }
    //일본 성 돌 축대(打込接): 크기가 제각각인 모난 돌을 줄 없이 맞물려 쌓는다(보로노이 칸 = 돌, 경계는 곧은 줄눈).
    //줄눈은 좁고 깊으며, 돌 면은 거칠고 평평하고 가장자리만 조금 깎인다
    private static IshigakiFn(N : number) : (_x : number, _y : number) => number[]
    {
        //칸 4×5(돌 하나 약 0.5×0.4m), 줄마다 반 칸씩 엇갈려 가로로 넓적한 돌이 대략 줄지어 앉는다. 거리 y를 늘려 돌을 가로로 눕힌다
        const gx = 4, gy = 5, cw = N / gx, ch = N / gy;
        const P = (_i : number, _j : number) =>
        {
            const i = ((_i % gx) + gx) % gx, j = ((_j % gy) + gy) % gy;
            return [(_i + (j % 2) * 0.5 + 0.2 + CForgeRand.HashF(i, j, 181) * 0.6) * cw, (_j + 0.3 + CForgeRand.HashF(i, j, 182) * 0.4) * ch, i, j];
        };
        return (x, y) =>
        {
            const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
            let d1 = Infinity, d2 = Infinity, bi = 0, bj = 0;
            for(let dj = -2; dj <= 2; dj++)
                for(let di = -2; di <= 2; di++)
                {
                    const p = P(ci + di, cj + dj), d = Math.hypot(x - p[0], (y - p[1]) * 1.5);
                    if(d < d1) { d2 = d1; d1 = d; bi = p[2]; bj = p[3]; } else if(d < d2) d2 = d;
                }
            const n = CForgeTex.Fbm(x / N * 8, y / N * 8, 8, 184), rough = CForgeTex.Fbm(x / N * 20, y / N * 20, 20, 185), edge = (d2 - d1) * 0.5;
            if(edge < 2.6) return [0.12 + n * 0.1, 0];
            const t = Math.min(1, (edge - 2.6) / 9), bevel = Math.sqrt(t * (2 - t)), tone = 0.55 + CForgeRand.HashF(bi, bj, 186) * 0.45;
            const stain = Math.max(0, CForgeTex.Fbm(x / N * 3, y / N * 3, 3, 187) - 0.5) * 0.7, crack = CForgeTex.Fbm(x / N * 12, y / N * 12, 12, 188) > 0.72 ? 0.12 : 0;
            return [tone * (0.72 + bevel * 0.28) + (rough - 0.5) * 0.22 - stain - crack, 0.1 + bevel * 0.65 + (rough - 0.5) * 0.35];
        };
    }
    //기와: 2m에 8줄, 줄마다 반 칸 엇갈림. 아랫단이 다음 줄 위로 겹쳐 두껍고(높이), 아래쪽이 그늘져 어둡다
    private static TileFn(N : number) : (_x : number, _y : number) => number[]
    {
        const rows = 8, rh = N / rows, tw = N / 10;
        return (x, y) =>
        {
            const r = Math.floor(y / rh), fy = (y - r * rh) / rh, xs = x + (r % 2) * tw * 0.5;
            const k = Math.floor(xs / tw), fx = (xs - k * tw) / tw;
            const tone = 0.86 + CForgeRand.HashF(r, ((k % 10) + 10) % 10, 4) * 0.14;
            const shade = 0.72 + 0.28 * Math.min(1, fy * 2.2);
            const gap = fx < 0.06 || fx > 0.94;
            const h = (gap ? 0.15 : 0.25) + 0.7 * Math.min(1, fy * 1.15) * (gap ? 0.5 : 1);
            return [tone * shade * (gap ? 0.85 : 1) + (CForgeRand.HashF(x, y, 8) - 0.5) * 0.03, h];
        };
    }

    //_fn(x, y) → [밝기, 높이]. _depth : 노말 세기, _rough·_roughVar : 거칠기(낮은 곳일수록 거칠게), _aoStr : 줄눈 AO 세기, _parallax : 높이 0~1의 UV 깊이(0이면 끔)
    private static Make(_frame : CFrame, _key : string, _fn : (_x : number, _y : number) => number[], _depth : number, _rough : number, _roughVar : number, _aoStr : number, _parallax : number)
    {
        const N = CForgeTex.sSize, col = new Uint8Array(N * N * 4), hgt = new Float32Array(N * N);
        for(let y = 0; y < N; y++)
            for(let x = 0; x < N; x++)
            {
                const [l, h] = _fn(x, y), o = y * N + x, v = Math.max(0, Math.min(1, l)) * 255;
                col[o * 4] = col[o * 4 + 1] = col[o * 4 + 2] = v;
                col[o * 4 + 3] = 255;
                hgt[o] = Math.max(0, Math.min(1, h));
            }
        CForgeTex.Upload(_frame, _key, col);
        CForgeTex.sBase.set(_key, col);
        CForgeTex.sPend.set(_key, () =>
        {
            const nk = _key.replace(".tex", "_n.tex"), mk = _key.replace(".tex", "_m.tex"), nor = CForgeTex.Normal(hgt, N, _depth);
            CForgeTex.Upload(_frame, nk, nor.buf);
            const mat = CForgeTex.Material(hgt, nor.ny, N, _rough, _roughVar, _aoStr);
            CForgeTex.sMatBuf.set(_key, mat);
            CForgeTex.Upload(_frame, mk, mat);
            return new CForgeTexSurf(nk, mk, _parallax);
        });
    }
    //노말·재질 텍스처. 노말·재질을 끈 오브젝트만 쓰면 만들지 않도록 처음 요청할 때 만든다
    static Surf(_key : string) : CForgeTexSurf
    {
        let s = CForgeTex.sSurf.get(_key);
        if(s == null && CForgeTex.sPend.has(_key))
        {
            s = CForgeTex.sPend.get(_key)();
            CForgeTex.sPend.delete(_key);
            CForgeTex.sSurf.set(_key, s);
        }
        return s ?? null;
    }

    //높이에서 접선 공간 노말(RGB)을 구하고 A에 패럴랙스용 높이를 넣는다(셰이더는 1-A를 깊이로 쓴다).
    //텍스처 v는 위로 올라가고 버퍼 y는 아래로 내려가므로 y 기울기 부호를 뒤집는다. 패럴랙스 높이는 한 번 흐려 계단 자글거림을 줄인다
    private static Normal(_h : Float32Array, N : number, _depth : number) : { buf : Uint8Array, ny : Float32Array }
    {
        const H = (_x : number, _y : number) => _h[((_y + N) % N) * N + ((_x + N) % N)], out = new Uint8Array(N * N * 4), ny = new Float32Array(N * N);
        for(let y = 0; y < N; y++)
            for(let x = 0; x < N; x++)
            {
                const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * 0.125 * _depth;
                const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * 0.125 * _depth;
                const l = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * N + x) * 4;
                let s = 0;
                for(let k = -1; k <= 1; k++) for(let m = -1; m <= 1; m++) s += H(x + m, y + k);
                ny[y * N + x] = dy * l;
                out[i] = (-dx * l * 0.5 + 0.5) * 255;
                out[i + 1] = (dy * l * 0.5 + 0.5) * 255;
                out[i + 2] = (l * 0.5 + 0.5) * 255;
                out[i + 3] = (0.1 + 0.9 * s / 9) * 255;
            }
        return { buf : out, ny };
    }
    //재질 R = AO, G = 거칠기(낮은 곳일수록 거칠게), B = 금속 0.
    //엔진 환경광은 노말을 보지 않아 그늘에서는 노말맵이 사라진다. 위를 보는 면은 하늘빛을 더 받는다고 보고 노말 y로 AO를 기울여 그늘에서도 굴곡이 보이게 한다
    private static Material(_h : Float32Array, _ny : Float32Array, N : number, _rough : number, _roughVar : number, _aoStr : number) : Uint8Array
    {
        const R = 4, H = (_x : number, _y : number) => _h[((_y + N) % N) * N + ((_x + N) % N)], out = new Uint8Array(N * N * 4);
        for(let y = 0; y < N; y++)
            for(let x = 0; x < N; x++)
            {
                let s = 0, n = 0;
                for(let k = -R; k <= R; k += 2) for(let m = -R; m <= R; m += 2) { s += H(x + m, y + k); n++; }
                const h = H(x, y), cav = 1 - Math.max(0, s / n - h) * _aoStr, i = (y * N + x) * 4;
                const ao = Math.max(0.25, Math.min(1, cav * (0.92 + _ny[y * N + x] * 0.9)));
                out[i] = ao * 255;
                out[i + 1] = Math.max(0.05, Math.min(1, _rough + (0.5 - h) * _roughVar)) * 255;
                out[i + 2] = 0;
                out[i + 3] = 255;
            }
        return out;
    }

    private static Upload(_frame : CFrame, _key : string, _buf : Uint8Array, N : number = CForgeTex.sSize)
    {
        const tex = new CTexture();
        tex.SetSize(N, N);
        tex.CreateBuf();
        (tex.GetBuf()[0] as Uint8Array).set(_buf);
        tex.Set("mFilter", CTexture.eFilter.Linear);
        tex.Set("mMipMap", CTexture.eMipmap.GL);
        tex.Set("mWrap", CTexture.eWrap.Repeat);
        tex.SetAniso(8);
        _frame.Res().Push(_key, tex);
        Promise.resolve(_frame.Ren().BuildTexture(tex)).then(() => { tex.mKeepBuf = false; tex.ReleaseBuf(); });
    }
}
