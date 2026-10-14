import { CAnimation, CClipCoodi, CClipImg } from "../../../artgine/app/component/CAnimation.js";
import { CH5CanvasInst } from "../../../artgine/render/CH5Canvas.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CParser } from "../../../artgine/util/parser/CParser.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CObject } from "../../basic/CObject.js";


// ── 공통 상수 ─────────────────────────────────────────────────────────────

// ── 팔레트 ────────────────────────────────────────────────────────────────
// V3(selections[] 기반, ulpc_selection.json)에서는 base/recolor hex가 선택 JSON에
// 직접 내장되어 오므로, 파일명/타입이름으로 재질을 "추측"할 필요가 없다.
// PALETTE_META는 V3의 중복 파일 선호도 판단(_buildV3 preferred)에서만 쓰인다.
const PALETTE_META: Record<string, { version: string; base: string }> = {
    cloth: { version: "ulpc", base: "white"  },
    body:  { version: "ulpc", base: "light"  },
    metal: { version: "ulpc", base: "steel"  },
    hair:  { version: "ulpc", base: "orange" },
    eye:   { version: "ulpc", base: "blue"   },
    all:   { version: "lpcr", base: "white"  },
};

// ── AnimClipSpec ───────────────────────────────────────────────────────────
// 이미지 굽기 이후 CAnimation 생성에 필요한 정보.
// key: mAniMap 키 (예: "walk_1", "thrust_oversize_0")
// yOffset: 캔버스 내 해당 방향 행의 Y 시작 위치
// frameSize: 프레임 픽셀 크기 (정방형)
// frameCount: 유효 프레임 수
// frameStart: 첫 프레임 인덱스 (walk는 1, 나머지는 0)
// scale: 렌더 스케일 (오버사이즈는 frameSize/64, 표준은 1)

interface AnimClipSpec {
    key:        string;
    yOffset:    number;
    frameSize:  number;
    frameCount: number;
    frameStart: number;
    scale:      number;
}
export class CULPC extends CObject
{
    static eState={
        "walk":"walk",
        "slash":"slash",
        "thrust":"thrust",
        "idle":"idle",
        "shoot":"shoot",
        
        "spellcast":"spellcast"
        
    };
    mAniMap = new Map<string, CAnimation>();
    mTexture: CTexture | null = null;

    // 1. 연관된 애니메이션들을 '그룹'으로 묶어줍니다.
    static AniGroups: string[][] = [
        ["walk", "move"],         // 이동 계열
        ["slash", "thrust", "attack","spellcast","shoot"],   // 공격 계열
        ["idle", "basic"]                // 대기 계열
    ];

    // 2. 그룹을 바탕으로 양방향(N:M) 매칭 맵을 자동 생성합니다.
    static FallbackMap: Record<string, string[]> = CULPC._CreateBidirectionalMap(CULPC.AniGroups);

    // 자동 생성 함수 (클래스 로드 시 1회만 실행됨)
    private static _CreateBidirectionalMap(groups: string[][]): Record<string, string[]> {
        const map: Record<string, string[]> = {};
        for (const group of groups) {
            for (const state of group) {
                // 자기 자신을 제외한, 같은 그룹 내의 다른 모든 상태들을 배열로 저장
                map[state] = group.filter(s => s !== state);
            }
        }
        return map;
    }

    

    // 단일 상태에 대한 검색 로직
    private _FindAniByState(state: string, dir: number, beforeDir: number): CAnimation | null
    {
        let value = this.mAniMap.get(state + "_" + dir);
        if (value != null) return value;

        value = this.mAniMap.get(state + "_" + beforeDir);
        if (value != null) return value;

        for (const [key, val] of this.mAniMap) {
            if (key.startsWith(state)) return val;
        }

        return null;
    }

    GetAni(_state: string, _dir: number, _beforeDir = 0): CAnimation 
    {
        // 1. 요청받은 원래 상태로 검색
        let ani = this._FindAniByState(_state, _dir, _beforeDir);
        if (ani != null) return ani;

        // 2. 못 찾았다면, 양방향 FallbackMap에서 대체 상태들을 가져와 검색
        // 예: _state가 "attack"이면 fallbackStates는 ["slash", "thrust"]가 됨
        const fallbackStates = CULPC.FallbackMap[_state];
        if (fallbackStates != null) {
            for (const fallbackState of fallbackStates) {
                ani = this._FindAniByState(fallbackState, _dir, _beforeDir);
                if (ani != null) return ani;
            }
        }

        // 3. 그래도 없으면 맵에 있는 것 중 아무거나 반환
        for (const val of this.mAniMap.values()) {
            return val;
        }

        return null;
    }
}
// // ── 결과 데이터 ────────────────────────────────────────────────────────────

// export class CULPC extends CObject
// {
//     mAniMap  = new Map<string, CAnimation>();
//     mTexture: CTexture = null;
//     GetTexName()
//     {
//         let textureFile = this.Key().replace(/\.json$/i, ".ulpc");
//         return textureFile;
//     }
//     GetAni(_state: string, _dir: number, _beforeDir = 0): CAnimation 
//     {
//         let value = this.mAniMap.get(_state + _dir);
//         if (value != null) return value;

//         value = this.mAniMap.get(_state + _beforeDir);
//         if (value != null) return value;

//         // _state 이름 포함된 것 중 아무거나
//         for (const [key, val] of this.mAniMap) {
//             if (key.startsWith(_state)) return val;
//         }

//         // 맵에 있는 것 중 아무거나
//         for (const val of this.mAniMap.values()) {
//             return val;
//         }

//         return null;
//     }
// }

// ── 파서 ──────────────────────────────────────────────────────────────────
var gResPath=null;
export class CParserULPC extends CParser {

    mFrameDelay: number = 0.125;
    private mAnimFilter: string[] | null = null;

    private mTempNRecolorCache = new Map<string, HTMLImageElement | HTMLCanvasElement>();

    constructor(animKeys: string[] | null = null) {
        super();
        this.mAnimFilter = animKeys;
    }

    static SetGlobalResBase(_path : string)
    {
        gResPath=_path;
    }
    private static sPaletteCache = new Map<string, Record<string, string[]>>();
    private static sRecolorCache = new Map<string, CanvasImageSource>();

    override GetResult(): CULPC { return this.mResult as CULPC; }

    override async Load(pa_fileName: string): Promise<void> {
        try {
            if (!this.mBuffer) await this.Open(pa_fileName);

            const rawJson = JSON.parse(new TextDecoder().decode(this.mBuffer));

            // 각 객체의 resBase를 selections[].files[]에 절대경로로 미리 적용한다.
            // (어레이일 때 각 항목별 resBase가 다를 수 있으므로 merge 전에 처리)
            const applyResBase = (obj: Record<string, any>) => {
                const base = obj.resBase ?? gResPath;
                if (!base) return;
                const rootSlash = base.endsWith('/') ? base : base + '/';
                if (Array.isArray(obj.selections)) {
                    for (const sel of obj.selections) {
                        if (Array.isArray(sel.files)) {
                            sel.files = sel.files.map((f: string) =>
                                /^https?:\/\//i.test(f) ? f : rootSlash + f
                            );
                        }
                    }
                }
            };

            let json: Record<string, any>;
            if (Array.isArray(rawJson)) {
                for (const obj of rawJson) applyResBase(obj);
                json = rawJson.reduce((merged: Record<string, any>, obj: Record<string, any>) => {
                    for (const [k, v] of Object.entries(obj)) {
                        if (Array.isArray(v)) merged[k] = [...(merged[k] ?? []), ...v];
                        else if (!(k in merged))  merged[k] = v;
                    }
                    return merged;
                }, {} as Record<string, any>);
            } else {
                applyResBase(rawJson);
                json = rawJson;
            }

            const resBase = json.resBase ?? gResPath ?? "";
            const rootSlash = resBase ? (resBase.endsWith('/') ? resBase : resBase + '/') : "";
            const absBase = rootSlash.replace(/\/$/, "");
            const result  = new CULPC();
            const cv      = new CH5CanvasInst();
            let textureFile = pa_fileName.replace(/\.json$/i, ".ulpc");
            

            // V3: selections[] 기반 (ulpc_selection.json) 만 지원한다.
            // (구버전 V2 layers[] 포맷은 제거됨 — TYPE_MATERIAL 기반 재질 추측 없이
            //  선택 JSON에 base/recolor hex가 직접 내장되어 오는 방식으로 통일)
            const specs: AnimClipSpec[] = await this._buildV3(json, absBase, cv);

            this._buildAnimMap(specs, result, textureFile);
            result.mTexture = cv.GetNewTex();
            result.mTexture.SetMipMap(CTexture.eMipmap.GL);
            this.mResult = result;
            result.SetKey(this.mFileName);
            
            result.mTexture.SetKey(textureFile);
        } finally {
            // 파싱이 끝나면 임시 캐시를 비워줍니다.
            this.mTempNRecolorCache.clear();
        }
    }

    // ── 공통: AnimClipSpec[] → CAnimation 맵 ─────────────────────────────

    private _buildAnimMap(specs: AnimClipSpec[], result: CULPC, textureFile: string): void {
        for (const s of specs) {
            const cAnim    = new CAnimation();
            const scaleVec = s.scale !== 1 ? new CVec2(s.scale, s.scale) : undefined;
            cAnim.Push(new CClipImg(0, 0, textureFile));
            for (let f = s.frameStart; f < s.frameCount; f++) {
                const stX = f * s.frameSize;
                const stY = s.yOffset;
                cAnim.Push(new CClipCoodi(-1, this.mFrameDelay,
                    stX, stY, stX + s.frameSize, stY + s.frameSize, scaleVec));
            }
            result.mAniMap.set(s.key, cAnim);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // V3: selections[] 기반 포맷 — 이미지 굽기 + AnimClipSpec 반환
    // 파일 경로에 a[animName]_yOffset / z[zPos] / material.version.color_size_frame_dirs.png
    // 가 인코딩되어 있어 가변 frameSize 처리 가능.
    // 애니메이션 종류/크기는 파일명에서 결정. 행 높이 = 해당 애니의 최대 frameSize.
    // 레이어 frameSize < 행 높이인 경우 중심 정렬(offset)로 합성.
    // ══════════════════════════════════════════════════════════════════════

    private async _buildV3(json: any, absBase: string, cv: CH5CanvasInst): Promise<AnimClipSpec[]> {

        // ── 1. 모든 파일 엔트리 파싱 ───────────────────────────────────────
        interface MatGroup {
            material:   string | null;
            version:    string | null;
            fileColor:  string | null;
            baseHex:    string[] | null;
            recolorHex: string[] | null;
        }
        interface NEntry {
            selIdx:     number;
            animName:   string;
            yOffset:    number;
            zPos:       number;
            frameSize:  number;
            frameCount: number;
            dirArr:     number[];
            matGroups:  MatGroup[];
            fullPath:   string;
            base64?:    string;
        }

        const rawEntries: NEntry[] = [];
        for (let si = 0; si < (json.selections as any[]).length; si++) {
            const sel     = json.selections[si];
            const recolors: Record<string, any> = sel.recolors ?? {};
            const files: string[] = sel.files ?? [];
            const base64s: string[] = sel.base64s ?? [];
            for (let fi = 0; fi < files.length; fi++) {
                const e = this._parseNEntry(files[fi], recolors, si) as NEntry;
                if (!e) continue;
                if (base64s[fi]) e.base64 = base64s[fi];
                rawEntries.push(e);
            }
        }

        // ── 1-b. 중복 제거: (selIdx, animName, zPos, matKey)당 최적 파일 1개 ──
        const preferred = new Map<string, NEntry>();
        for (const e of rawEntries) {
            const g0     = e.matGroups[0] as MatGroup;
            const matKey = g0.material && g0.version ? `${g0.material}.${g0.version}` : 'default';
            const key    = `${e.selIdx}|${e.animName}|${e.zPos}|${matKey}`;

            if (!preferred.has(key)) {
                preferred.set(key, e);
            } else {
                const curG0  = (preferred.get(key)! as NEntry).matGroups[0] as MatGroup;
                const selObj = (json.selections as any[])[e.selIdx];
                if (matKey === 'variant.v1') {
                    const want = selObj?.recolors?.['variant.v1']?.color ?? null;
                    if (g0.fileColor === want && curG0.fileColor !== want) preferred.set(key, e);
                } else if (g0.material && PALETTE_META[g0.material]) {
                    const want = PALETTE_META[g0.material].base;
                    if (g0.fileColor === want && curG0.fileColor !== want) preferred.set(key, e);
                }
            }
        }

        const hasRecolor = new Set<string>();
        for (const key of preferred.keys()) {
            if (!key.endsWith('|default')) {
                hasRecolor.add(key.substring(0, key.lastIndexOf('|')));
            }
        }
        const entries: NEntry[] = [];
        for (const [key, e] of preferred) {
            if (key.endsWith('|default')) {
                const pos = key.substring(0, key.lastIndexOf('|'));
                if (hasRecolor.has(pos)) continue;
            }
            entries.push(e);
        }

        // ── 2. animName별 그룹화 + zPos 정렬 ──────────────────────────────
        const byAnim = new Map<string, NEntry[]>();
        for (const e of entries) {
            if (e.animName === 'all') continue;
            if (!byAnim.has(e.animName)) byAnim.set(e.animName, []);
            byAnim.get(e.animName)!.push(e);
        }
        for (const arr of byAnim.values()) arr.sort((a, b) => a.zPos - b.zPos);

        if (this.mAnimFilter) {
            const allowed = new Set(this.mAnimFilter);
            for (const key of byAnim.keys()) {
                if (!allowed.has(key)) byAnim.delete(key);
            }
        }


        // ── 3. animYMap 빌드: 파싱 순서대로, 행 높이 = 해당 애니의 최대 frameSize ──
        interface AInfo { y: number; dirs: number[]; frameCount: number; frameSize: number; minFS: number; }
        const animYMap = new Map<string, AInfo>();
        let canvasH = 0, canvasW = 0;

        for (const [anim, arr] of byAnim) {
            const dirs  = arr[0].dirArr;
            const minFC = Math.min(...arr.map(e => e.frameCount));
            const maxFC = Math.max(...arr.map(e => e.frameCount));
            const minFS = Math.min(...arr.map(e => e.frameSize));
            const maxFS = Math.max(...arr.map(e => e.frameSize));
            animYMap.set(anim, { y: canvasH, dirs, frameCount: minFC, frameSize: maxFS, minFS });
            canvasW = Math.max(canvasW, maxFC * maxFS);
            canvasH += dirs.length * maxFS;
        }

        // ── 4. 캔버스 초기화 ──────────────────────────────────────────────
        cv.Init(canvasW || 1, canvasH || 1, false, false);
        await cv.Draw();
        const ctx = cv.GetContext();
        ctx.imageSmoothingEnabled = false;

        // ── 5. 이미지 로드 및 리컬러링 병렬 처리 (최적화 핵심) ────────────────
        // 모든 엔트리에 대해 병렬 처리를 위한 프로미스 생성
        const processTasks = entries.map(async (e) => {
            // fullPath는 이미 applyResBase에서 각 항목별 resBase가 적용되었으므로 그대로 사용한다.
            const url    = this._encodeNPath(e.fullPath);
            const img    = await this._loadImg(e.base64 ?? url);
            if (!img) return { entry: e, img: null };
            const rc     = await this._applyNRecolor(img, e.matGroups);
            return { entry: e, img: rc };
        });

        const results = await Promise.all(processTasks);
        const imgMap = new Map<NEntry, CanvasImageSource | HTMLImageElement | null>();
        for (const res of results) imgMap.set(res.entry, res.img);

        // ── 6. 전체 애니메이션 드로잉 (순서 유지) ───────────────────────────
        for (const [anim, { y: dstY, dirs, frameSize: maxFS }] of animYMap) {
            for (const e of byAnim.get(anim)!) {
                const img = imgMap.get(e);
                if (!img) continue;
                const offset = (maxFS - e.frameSize) / 2;
                for (let d = 0; d < dirs.length; d++) {
                    const rowY = dstY + d * maxFS;
                    for (let f = 0; f < e.frameCount; f++)
                        ctx.drawImage(img as CanvasImageSource,
                            f * e.frameSize, d * e.frameSize, e.frameSize, e.frameSize,
                            f * maxFS + offset, rowY + offset, e.frameSize, e.frameSize);
                }
            }
        }

        // ── 7. AnimClipSpec 수집 ──────────────────────────────────────────
        const specs: AnimClipSpec[] = [];
        for (const [anim, { y: dstY, dirs, frameCount, frameSize: maxFS, minFS }] of animYMap) {
            const scale = maxFS / minFS;
            for (let d = 0; d < dirs.length; d++) {
                const key = dirs.length > 1 ? `${anim}_${dirs[d]}` : anim;
                specs.push({ key, yOffset: dstY + d * maxFS, frameSize: maxFS,
                    frameCount, frameStart: 0, scale });
            }
        }

        return specs;
    }

    private _swapPalette(
        src: HTMLImageElement | HTMLCanvasElement,
        srcColors: string[],
        dstColors: string[]
    ): HTMLCanvasElement | null {
        const w = src instanceof HTMLCanvasElement ? src.width  : (src as HTMLImageElement).naturalWidth;
        const h = src instanceof HTMLCanvasElement ? src.height : (src as HTMLImageElement).naturalHeight;
        if (w === 0 || h === 0) return null;

        const colorMap = this._get32BitColorMap(srcColors, dstColors);
        if (colorMap.size === 0) return null;

        const tmp = document.createElement("canvas");
        tmp.width = w; tmp.height = h;
        const tmpCtx = tmp.getContext("2d")!;
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.drawImage(src as CanvasImageSource, 0, 0);
        
        const imgData = tmpCtx.getImageData(0, 0, w, h);
        const data = new Uint32Array(imgData.data.buffer);
        let changed = false;

        for (let i = 0; i < data.length; i++) {
            const pixel = data[i];
            if ((pixel & 0xFF000000) === 0) continue; // Skip transparent
            
            const replaced = colorMap.get(pixel);
            if (replaced !== undefined && replaced !== pixel) {
                data[i] = replaced;
                changed = true;
            }
        }

        if (!changed) return null;

        tmpCtx.putImageData(imgData, 0, 0);
        return tmp;
    }

    private _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }

    private static sColorMapCache = new Map<string, Map<number, number>>();
    private _get32BitColorMap(srcColors: string[], dstColors: string[]): Map<number, number> {
        const key = srcColors.join(',') + '|' + dstColors.join(',');
        if (CParserULPC.sColorMapCache.has(key)) return CParserULPC.sColorMapCache.get(key)!;

        const map = new Map<number, number>();
        for (let i = 0; i < srcColors.length && i < dstColors.length; i++) {
            const s = this._hexToRgb(srcColors[i]);
            const d = this._hexToRgb(dstColors[i]);
            if (!s || !d) continue;

            // `>>> 0`으로 부호 없는 32비트로 맞춘다. JS의 비트 연산 결과는 부호 있는 32비트라
            // (255 << 24)가 -16777216(음수)이 되는데, _swapPalette는 픽셀을 Uint32Array(부호 없음)로
            // 읽어서 이 맵을 조회한다 — 키는 음수, 조회는 양수라 매칭이 단 한 번도 성립하지 않았다
            // (그래서 recolor 기능 전체가 조용히 무동작이었다).
            const dst32 = ((255 << 24) | (d.b << 16) | (d.g << 8) | d.r) >>> 0;
            // Populate +/- 1 tolerance (3x3x3 = 27 entries per color)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dg = -1; dg <= 1; dg++) {
                    for (let db = -1; db <= 1; db++) {
                        const r = Math.max(0, Math.min(255, s.r + dr));
                        const g = Math.max(0, Math.min(255, s.g + dg));
                        const b = Math.max(0, Math.min(255, s.b + db));
                        const src32 = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
                        map.set(src32, dst32);
                    }
                }
            }
        }
        CParserULPC.sColorMapCache.set(key, map);
        return map;
    }

    // ── 유틸 ──────────────────────────────────────────────────────────────

    private _loadImg(url: string): Promise<HTMLImageElement | null> {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload  = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // ── V3 헬퍼 ───────────────────────────────────────────────────────────

    private _encodeNPath(path: string): string {
        return path.split('/').map(seg =>
            seg.replace(/\[/g, '%5B').replace(/\]/g, '%5D')
        ).join('/');
    }

    private _parseNEntry(filePath: string, recolors: Record<string, any>, selIdx: number): object | null {
        const segs = filePath.split('/');
        const aIdx = segs.findIndex(s => /^a\[/.test(s));
        if (aIdx < 0) return null;

        const am = segs[aIdx].match(/^a\[(.+?)\](?:_(\d+))?$/);
        if (!am) return null;
        const animName = am[1];
        const yOffset  = am[2] !== undefined ? parseInt(am[2], 10) : 0;

        const zSeg = segs[aIdx + 1];
        if (!zSeg?.startsWith('z')) return null;
        const zPos = parseInt(zSeg.slice(1), 10);

        const fname = segs[aIdx + 2];
        if (!fname) return null;

        const parsed = this._parseNFilename(fname, recolors) as any;
        if (!parsed) return null;

        parsed.dirArr = this._parseDirsStr(parsed._dirs ?? null);

        return { selIdx, animName, yOffset, zPos, ...parsed, fullPath: filePath };
    }

    private _parseNFilename(fname: string, recolors: Record<string, any>): object | null {
        const noext  = fname.replace(/\.png$/i, '');
        const tokens = noext.split('_');
        if (tokens.length < 2) return null;

        const t = [...tokens];

        const dirsStr  = t.pop()!;
        if (!/^[0-3]+$/.test(dirsStr)) return null;
        const dirs     = dirsStr;
        const frameCount = parseInt(t.pop()!, 10);
        const frameSize  = parseInt(t.pop()!, 10);
        if (isNaN(frameCount) || isNaN(frameSize) || t.length === 0) return null;

        const matGroups = this._parsePaletteGroups(t, recolors);
        return { matGroups, frameSize, frameCount, _dirs: dirs, dirArr: [] };
    }

    private _parseDirsStr(dirs: string | null): number[] {
        if (dirs && /^[0-3]+$/.test(dirs)) return dirs.split('').map(Number);
        return [];
    }

    private _parsePaletteGroups(tokens: string[], recolors: Record<string, any>): object[] {
        const groups: { material: string|null; version: string|null; fileColor: string|null; baseHex: string[]|null; recolorHex: string[]|null }[] = [];
        let cur: typeof groups[0] | null = null;

        for (const tok of tokens) {
            const dots = (tok.match(/\./g) || []).length;
            if (dots >= 2) {
                if (cur) groups.push(cur);
                const parts     = tok.split('.');
                const material  = parts[0];
                const version   = parts[1];
                const fileColor = parts.slice(2).join('.');
                const matKey    = `${material}.${version}`;
                const rc        = recolors[matKey] ?? null;
                cur = { material, version, fileColor, baseHex: rc?.base ?? null, recolorHex: rc?.recolor ?? null };
            } else if (dots === 0 && cur) {
                cur.fileColor += '_' + tok;
            }
        }
        if (cur) groups.push(cur);

        if (groups.length === 0)
            groups.push({ material: null, version: null, fileColor: tokens.join('_'), baseHex: null, recolorHex: null });

        return groups;
    }

    private async _applyNRecolor(
        img: HTMLImageElement,
        matGroups: any[],
    ): Promise<HTMLImageElement | HTMLCanvasElement> {
        // 이미지 소스(URL 또는 base64)와 matGroups 조합으로 캐시 키 생성
        const matKey = JSON.stringify(matGroups);
        const cacheKey = `${img.src}|${matKey}`;
        if (this.mTempNRecolorCache.has(cacheKey)) return this.mTempNRecolorCache.get(cacheKey)!;

        let current: HTMLImageElement | HTMLCanvasElement = img;

        for (const g of matGroups) {
            if (!g.baseHex || !g.recolorHex) continue;
            const res = this._swapPalette(current, g.baseHex, g.recolorHex);
            if (res) current = res;
        }

        this.mTempNRecolorCache.set(cacheKey, current);
        return current;
    }
}
