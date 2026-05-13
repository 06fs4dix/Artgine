import { CAnimation, CClipCoodi, CClipImg } from "../../../artgine/app/component/CAnimation.js";
import { CH5CanvasInst } from "../../../artgine/render/CH5Canvas.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CParser } from "../../../artgine/util/parser/CParser.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CObject } from "../../basic/CObject.js";


// ── 공통 상수 ─────────────────────────────────────────────────────────────

const ANIMS: Record<string, { f: number }> = {
    spellcast:   { f: 7  },
    thrust:      { f: 8  },
    walk:        { f: 9  },
    slash:       { f: 6  },
    shoot:       { f: 13 },
    hurt:        { f: 6  },
    climb:       { f: 6  },
    idle:        { f: 2  },
    jump:        { f: 5  },
    sit:         { f: 3  },
    emote:       { f: 3  },
    run:         { f: 8  },
    combat_idle: { f: 2  },
    backslash:   { f: 13 },
    halfslash:   { f: 6  },
};

const ANIM_YOFFSETS: Record<string, number> = {
    spellcast: 0,    thrust:     256,  walk:       512,  slash:    768,
    shoot:     1024, hurt:       1280, climb:      1344, idle:     1408,
    jump:      1664, sit:        1920, emote:      2176, run:      2432,
    combat_idle: 2688, backslash: 2944, halfslash: 3200,
};

const ONE_DIR_ANIMS = new Set(['hurt', 'climb']);

function getDirArr(dir: any, animName: string): number[] {
    if (dir && !Array.isArray(dir) && typeof dir === 'object') {
        return dir[animName] ?? (ONE_DIR_ANIMS.has(animName) ? [1] : [0, 2, 1, 3]);
    }
    return ONE_DIR_ANIMS.has(animName) ? [1] : [0, 2, 1, 3];
}

const ANIM_ORDER = [
    'spellcast', 'thrust', 'walk', 'slash', 'shoot', 'hurt', 'climb',
    'idle', 'jump', 'sit', 'emote', 'run', 'combat_idle', 'backslash', 'halfslash',
];

const COMPOSITE_W = 832;
const FRAME_SIZE  = 64;

// ── 팔레트 ────────────────────────────────────────────────────────────────

const PALETTE_META: Record<string, { version: string; base: string }> = {
    cloth: { version: "ulpc", base: "white"  },
    body:  { version: "ulpc", base: "light"  },
    metal: { version: "ulpc", base: "steel"  },
    hair:  { version: "ulpc", base: "orange" },
    eye:   { version: "ulpc", base: "blue"   },
    all:   { version: "lpcr", base: "white"  },
};

const TYPE_MATERIAL: Record<string, string[]> = {
    clothes:    ["cloth"],
    torso:      ["cloth"],
    shoulders:  ["cloth", "metal"],
    body:       ["body"],
    head:       ["body"],
    expression: ["body"],
    face:       ["body"],
    hair:       ["hair"],
    eyes:       ["eye"],
};
const PALETTE_FALLBACK_ORDER = ["cloth", "body", "metal", "hair", "eye"];

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
        "thrush":"thrush",
        "idle":"idle"
    };
    mAniMap = new Map<string, CAnimation>();
    mTexture: CTexture | null = null;

    // 1. 연관된 애니메이션들을 '그룹'으로 묶어줍니다.
    static AniGroups: string[][] = [
        ["walk", "move"],         // 이동 계열
        ["slash", "thrush", "attack"],   // 공격 계열
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
        // 예: _state가 "attack"이면 fallbackStates는 ["slash", "thrush"]가 됨
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

    mResBase:    string = null;
    mFrameDelay: number = 0.125;
    private mAnimFilter: string[] | null = null;

    constructor(animKeys: string[] | null = null) {
        super();
        this.mAnimFilter = animKeys;
    }

    static SetGlobalResBase(_path : string)
    {
        gResPath=_path;
    }
    private static sPaletteCache = new Map<string, Record<string, string[]>>();

    override GetResult(): CULPC { return this.mResult as CULPC; }

    override async Load(pa_fileName: string): Promise<void> {
        if (!this.mBuffer) await this.Open(pa_fileName);

        const rawJson = JSON.parse(new TextDecoder().decode(this.mBuffer));
        const json    = Array.isArray(rawJson)
            ? rawJson.reduce((merged: Record<string, any>, obj: Record<string, any>) => {
                for (const [k, v] of Object.entries(obj)) {
                    if (Array.isArray(v)) merged[k] = [...(merged[k] ?? []), ...v];
                    else if (!(k in merged))  merged[k] = v;
                }
                return merged;
            }, {} as Record<string, any>)
            : rawJson;
        const resBase = this.mResBase || gResPath || json.mresBase || "./";
        const absRoot = new URL(resBase, location.href).toString();
        const rootSlash = absRoot.endsWith('/') ? absRoot : absRoot + '/';
        const absBase = new URL(json.resBase ?? "spritesheets", rootSlash).toString().replace(/\/$/, "");
        const result  = new CULPC();
        const cv      = new CH5CanvasInst();
        let textureFile = pa_fileName.replace(/\.json$/i, ".ulpc");
        

        let specs: AnimClipSpec[];
        if (Array.isArray(json.selections)) {
            // V3: selections[] 기반 (ulpc_selection.json)
            specs = await this._buildV3(json, absBase, cv);
        } else {
            // V2: layers[] 기반 (sample.json)
            const paletteBase = absRoot.replace(/\/$/, "") + "/palette_definitions/";
            specs = await this._buildV2(json, absBase, paletteBase, cv);
        }

        this._buildAnimMap(specs, result, textureFile);
        result.mTexture = cv.GetNewTex();
        result.mTexture.SetMipMap(CTexture.eMipmap.GL);
        this.mResult = result;
        result.SetKey(this.mFileName);
        
        result.mTexture.SetKey(textureFile);

        
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
    // V2: layers[] 기반 포맷 — 이미지 굽기 + AnimClipSpec 반환
    // 애니메이션 영역이 sizeBase(64) 단위로 ANIM_ORDER 순서로 고정 스택됨.
    // 오버사이즈(128/192px)는 표준 섹션 아래에 별도 영역으로 추가됨.
    // ══════════════════════════════════════════════════════════════════════

    private async _buildV2(json: any, absBase: string, paletteBase: string, cv: CH5CanvasInst): Promise<AnimClipSpec[]> {
        const layers   = [...((json.layers ?? []) as any[])].sort((a, b) => a.zPos - b.zPos);
        const sizeBase: number = json.sizeBase ?? FRAME_SIZE;

        // ── 1. 레이어에서 오버사이즈 섹션 도출 ──────────────────────────
        interface OversizeSection {
            animName: string; baseAnim: string;
            frameSize: number; cols: number; dirArr: number[];
            yOffset: number; idleYOffset: number;
        }
        const oversizeSections: OversizeSection[] = [];
        const seenAnim = new Set<string>();

        for (const layer of layers) {
            if ((layer.size ?? FRAME_SIZE) <= sizeBase) continue;
            const supported: string[] = layer.supportedAnimations ?? [];
            for (const animName of supported) {
                if (seenAnim.has(animName)) continue;
                const baseAnim = this._extractBaseAnim(animName);
                if (!baseAnim) continue;
                seenAnim.add(animName);
                const dirArr: number[] = getDirArr(layer.dir, animName);
                oversizeSections.push({
                    animName, baseAnim,
                    frameSize: layer.size,
                    cols: layer.frame,
                    dirArr,
                    yOffset: 0, idleYOffset: 0,
                });
            }
        }

        // ── 2. 표준 애니메이션 Y 맵 동적 빌드 ──────────────────────────
        interface AnimInfo { y: number; dirs: number[]; }
        const animYMap = new Map<string, AnimInfo>();
        let stackY = 0;
        for (const animName of ANIM_ORDER) {
            const supportingLayer = layers.find(l =>
                (l.size ?? FRAME_SIZE) <= sizeBase &&
                (l.supportedAnimations ?? []).includes(animName)
            );
            if (!supportingLayer) continue;
            const dirs: number[] = getDirArr(supportingLayer.dir, animName);
            animYMap.set(animName, { y: stackY, dirs });
            stackY += dirs.length * sizeBase;
        }
        const idleDirs = animYMap.get("idle")?.dirs ?? [0, 2, 1, 3];
        const idleF    = ANIMS["idle"].f;

        // ── 3. 캔버스 크기 계산 ──────────────────────────────────────────
        let canvasW = COMPOSITE_W;
        let canvasH = stackY;
        for (const sec of oversizeSections) {
            sec.yOffset = canvasH;
            if (sec.cols * sec.frameSize > canvasW) canvasW = sec.cols * sec.frameSize;
            canvasH += sec.dirArr.length * sec.frameSize;
            sec.idleYOffset = canvasH;
            if (idleF * sec.frameSize > canvasW) canvasW = idleF * sec.frameSize;
            canvasH += idleDirs.length * sec.frameSize;
        }

        // ── 4. 캔버스 초기화 ─────────────────────────────────────────────
        cv.Init(canvasW, canvasH, false, false);
        await cv.Draw();
        const ctx = cv.GetContext();
        ctx.imageSmoothingEnabled = false;

        // ── 5. 표준 섹션 드로잉 ──────────────────────────────────────────
        const pendingFallbacks: { url: string; layer: any; dstY: number }[] = [];

        for (const [animName, { y: dstY }] of animYMap) {
            for (const layer of layers) {
                const supported: string[] = layer.supportedAnimations ?? [];
                const isOversize = supported.some(a => seenAnim.has(a));
                if (isOversize) continue;

                if (supported.length > 0 && !supported.includes(animName)) {
                    if (animName !== "idle") continue;
                    const fallback = ["walk", "hurt", ...supported]
                        .find(a => supported.includes(a) && ANIMS[a] !== undefined);
                    if (!fallback) continue;
                    const url = absBase + "/" + this._swapAnim(layer.fileName, fallback);
                    pendingFallbacks.push({ url, layer, dstY });
                    continue;
                }

                const url = absBase + "/" + this._swapAnim(layer.fileName, animName);
                const img = await this._loadAndRecolor(url, layer, paletteBase);
                if (img) ctx.drawImage(img as CanvasImageSource, 0, dstY);
            }
        }

        // ── 5.5. idle fallback: frame-0 spread ───────────────────────────
        for (const { url, layer, dstY } of pendingFallbacks) {
            const img = await this._loadAndRecolor(url, layer, paletteBase);
            if (!img) continue;
            for (let d = 0; d < idleDirs.length; d++) {
                const srcY = d * sizeBase;
                const rowY = dstY + d * sizeBase;
                for (let f = 0; f < idleF; f++) {
                    ctx.drawImage(img as CanvasImageSource, 0, srcY, sizeBase, sizeBase,
                        f * sizeBase, rowY, sizeBase, sizeBase);
                }
            }
        }

        // ── 6. 오버사이즈 섹션 드로잉 ────────────────────────────────────
        for (const sec of oversizeSections) {
            const { animName, baseAnim, frameSize, cols, dirArr, yOffset } = sec;
            const offset   = (frameSize - sizeBase) / 2;
            const reversed = animName.includes('_reverse');

            for (const layer of layers) {
                const supported: string[] = layer.supportedAnimations ?? [];
                let oversizeImg: CanvasImageSource | null = null;

                if (supported.includes(animName)) {
                    oversizeImg = await this._loadAndRecolor(absBase + "/" + layer.fileName, layer, paletteBase);
                }

                if (oversizeImg) {
                    for (let d = 0; d < dirArr.length; d++)
                        for (let f = 0; f < cols; f++)
                            ctx.drawImage(oversizeImg,
                                f * frameSize, d * frameSize, frameSize, frameSize,
                                f * frameSize, yOffset + d * frameSize, frameSize, frameSize);
                } else if (supported.length === 0 || supported.includes(baseAnim)) {
                    const stdImg = await this._loadAndRecolor(
                        absBase + "/" + this._swapAnim(layer.fileName, baseAnim), layer, paletteBase);
                    if (!stdImg) continue;
                    for (let d = 0; d < dirArr.length; d++)
                        for (let f = 0; f < cols; f++) {
                            const srcF = reversed ? (cols - 1 - f) : f;
                            ctx.drawImage(stdImg,
                                srcF * sizeBase, d * sizeBase, sizeBase, sizeBase,
                                f * frameSize + offset, yOffset + d * frameSize + offset,
                                sizeBase, sizeBase);
                        }
                }
            }
        }

        // ── 6.5. 오버사이즈 idle 영역 드로잉 ─────────────────────────────
        for (const sec of oversizeSections) {
            const { animName, baseAnim, frameSize, idleYOffset } = sec;
            const offset = (frameSize - sizeBase) / 2;

            for (const layer of layers) {
                const supported: string[] = layer.supportedAnimations ?? [];
                const isOversizeForThis  = supported.includes(animName);
                const isOversizeForOther = supported.some(a => seenAnim.has(a) && a !== animName);
                if (isOversizeForOther) continue;

                if (isOversizeForThis) {
                    const oversizeAnim = supported.find(a => seenAnim.has(a)) ?? animName;
                    const walkUrl = absBase + "/" + layer.fileName.replace(`/${oversizeAnim}/`, `/${baseAnim}/`);
                    const img = await this._loadAndRecolor(walkUrl, layer, paletteBase);
                    if (!img) continue;
                    for (let d = 0; d < idleDirs.length; d++)
                        for (let f = 0; f < idleF; f++)
                            ctx.drawImage(img as CanvasImageSource,
                                0, d * frameSize, frameSize, frameSize,
                                f * frameSize, idleYOffset + d * frameSize, frameSize, frameSize);
                } else if (supported.length === 0 || supported.includes(baseAnim)) {
                    const canUseIdle = supported.length === 0 || supported.includes("idle");
                    const srcAnim    = canUseIdle ? "idle" : baseAnim;
                    const srcUrl     = absBase + "/" + this._swapAnim(layer.fileName, srcAnim);
                    const img = await this._loadAndRecolor(srcUrl, layer, paletteBase);
                    if (!img) continue;
                    for (let d = 0; d < idleDirs.length; d++)
                        for (let f = 0; f < idleF; f++) {
                            const srcF = canUseIdle ? f : 0;
                            ctx.drawImage(img as CanvasImageSource,
                                srcF * sizeBase, d * sizeBase, sizeBase, sizeBase,
                                f * frameSize + offset, idleYOffset + d * frameSize + offset,
                                sizeBase, sizeBase);
                        }
                }
            }
        }

        // ── 7. AnimClipSpec 수집 ──────────────────────────────────────────
        const specs: AnimClipSpec[] = [];

        for (const [animName, { y: dstY, dirs }] of animYMap) {
            const fStart = animName === "walk" ? 1 : 0;
            for (let d = 0; d < dirs.length; d++) {
                const key = dirs.length > 1 ? `${animName}_${dirs[d]}` : animName;
                specs.push({ key, yOffset: dstY + d * sizeBase, frameSize: sizeBase,
                    frameCount: ANIMS[animName].f, frameStart: fStart, scale: 1 });
            }
        }

        for (const sec of oversizeSections) {
            const { animName, baseAnim, frameSize, cols, dirArr, yOffset, idleYOffset } = sec;
            const scale  = frameSize / sizeBase;
            const fStart = baseAnim === "walk" ? 1 : 0;
            for (let d = 0; d < dirArr.length; d++) {
                const key = dirArr.length > 1 ? `${animName}_${dirArr[d]}` : animName;
                specs.push({ key, yOffset: yOffset + d * frameSize,
                    frameSize, frameCount: cols, frameStart: fStart, scale });
            }
            for (let d = 0; d < idleDirs.length; d++) {
                specs.push({ key: `idle_${idleDirs[d]}`, yOffset: idleYOffset + d * frameSize,
                    frameSize, frameCount: idleF, frameStart: 0, scale });
            }
        }

        return specs;
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
        // variant.v1 → 선택된 color 파일만, 일반 material → PALETTE_META base 파일 우선
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

        // default 파일: 같은 위치에 recolor 파일이 있으면 제외
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

        // ── 6. 전체 애니메이션 드로잉 ─────────────────────────────────────
        for (const [anim, { y: dstY, dirs, frameCount, frameSize: maxFS }] of animYMap) {
            for (const e of byAnim.get(anim)!) {
                const rawPath = this._encodeNPath(e.fullPath);
                const url    = /^https?:\/\//i.test(e.fullPath) ? rawPath : absBase + '/' + rawPath;
                const img    = await this._loadImg(e.base64 ?? url);
                if (!img) continue;
                const rc     = await this._applyNRecolor(img, e.matGroups);
                const offset = (maxFS - e.frameSize) / 2;
                for (let d = 0; d < dirs.length; d++) {
                    const rowY = dstY + d * maxFS;
                    for (let f = 0; f < e.frameCount; f++)
                        ctx.drawImage(rc as CanvasImageSource,
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

    // ── V2 팔레트 리컬러 ──────────────────────────────────────────────────

    private async _loadAndRecolor(
        url: string,
        layer: any,
        paletteBase: string
    ): Promise<CanvasImageSource | null> {
        const recolors: Record<string, string> | null = layer.recolors ?? null;

        if (!recolors || Object.keys(recolors).length === 0) {
            return this._loadImg(url);
        }

        const img = await this._loadImg(url);
        if (img) {
            const swapped = await this._applyRecolors(img, recolors, paletteBase);
            return swapped ?? img;
        }

        const firstColor = Object.values(recolors)[0];
        if (firstColor) {
            const variantUrl = this._toVariantUrl(url, firstColor);
            if (variantUrl !== url) return this._loadImg(variantUrl);
        }

        return null;
    }

    private _toVariantUrl(url: string, colorName: string): string {
        if (!colorName) return url;
        return url.replace(/\/([^/]+)\.png$/i, `/$1/${colorName}.png`);
    }

    private _parseRecolorKey(key: string): { material: string | null; version: string | null; color: string } {
        const parts = key.split('.');
        if (parts.length === 3) return { material: parts[0], version: parts[1], color: parts[2] };
        if (parts.length === 2) return { material: parts[0], version: null,     color: parts[1] };
        return { material: null, version: null, color: parts[0] };
    }

    private async _applyRecolors(
        img: HTMLImageElement,
        recolors: Record<string, string>,
        paletteBase: string
    ): Promise<HTMLCanvasElement | null> {
        let current: HTMLImageElement | HTMLCanvasElement = img;
        let changed = false;

        for (const [typeName, targetColor] of Object.entries(recolors)) {
            const parsed = this._parseRecolorKey(targetColor);

            const tgtMaterial = parsed.material ?? (TYPE_MATERIAL[typeName]?.[0] ?? "cloth");
            const tgtVersion  = parsed.version  ?? PALETTE_META[tgtMaterial]?.version;
            const tgtPalette  = await this._fetchPalette(tgtMaterial, paletteBase, tgtVersion);
            if (!tgtPalette) continue;
            const dstColors = tgtPalette[parsed.color];
            if (!dstColors) continue;

            const srcCandidates = [
                ...(parsed.material ? [parsed.material] : []),
                ...(TYPE_MATERIAL[typeName] ?? []),
                ...PALETTE_FALLBACK_ORDER,
            ].filter((m, i, arr) => arr.indexOf(m) === i);

            for (const srcMaterial of srcCandidates) {
                const srcVersion = PALETTE_META[srcMaterial]?.version;
                const srcPalette = await this._fetchPalette(srcMaterial, paletteBase, srcVersion);
                if (!srcPalette) continue;
                const srcBase   = PALETTE_META[srcMaterial]?.base ?? "white";
                if (srcMaterial === tgtMaterial && srcBase === parsed.color) continue;
                const srcColors = srcPalette[srcBase];
                if (!srcColors) continue;

                const result = this._swapPalette(current, srcColors, dstColors);
                if (this._hasChanged(current, result)) { current = result; changed = true; }
            }
        }

        return changed ? (current as HTMLCanvasElement) : null;
    }

    private async _fetchPalette(
        material: string,
        paletteBase: string,
        version?: string
    ): Promise<Record<string, string[]> | null> {
        const meta = PALETTE_META[material];
        const ver  = version ?? meta?.version;
        if (!ver) return null;
        const cacheKey = `${material}_${ver}`;
        if (CParserULPC.sPaletteCache.has(cacheKey)) return CParserULPC.sPaletteCache.get(cacheKey);
        const url = `${paletteBase}${material}/${material}_${ver}.json`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const data: Record<string, string[]> = await resp.json();
            CParserULPC.sPaletteCache.set(cacheKey, data);
            return data;
        } catch { return null; }
    }

    private _swapPalette(
        src: HTMLImageElement | HTMLCanvasElement,
        srcColors: string[],
        dstColors: string[]
    ): HTMLCanvasElement {
        const w = src instanceof HTMLCanvasElement ? src.width  : (src as HTMLImageElement).naturalWidth;
        const h = src instanceof HTMLCanvasElement ? src.height : (src as HTMLImageElement).naturalHeight;
        const tmp = document.createElement("canvas");
        tmp.width = w; tmp.height = h;
        const tmpCtx = tmp.getContext("2d");
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.drawImage(src as CanvasImageSource, 0, 0);
        const imgData = tmpCtx.getImageData(0, 0, w, h);
        const data    = imgData.data;

        const pairs: Array<{ sr: number; sg: number; sb: number; dr: number; dg: number; db: number }> = [];
        for (let i = 0; i < srcColors.length && i < dstColors.length; i++) {
            const s = this._hexToRgb(srcColors[i]);
            const d = this._hexToRgb(dstColors[i]);
            if (s && d) pairs.push({ sr: s.r, sg: s.g, sb: s.b, dr: d.r, dg: d.g, db: d.b });
        }

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            for (const p of pairs) {
                if (Math.abs(r - p.sr) <= 1 && Math.abs(g - p.sg) <= 1 && Math.abs(b - p.sb) <= 1) {
                    data[i] = p.dr; data[i + 1] = p.dg; data[i + 2] = p.db;
                    break;
                }
            }
        }

        tmpCtx.putImageData(imgData, 0, 0);
        return tmp;
    }

    private _hasChanged(
        before: HTMLImageElement | HTMLCanvasElement,
        after: HTMLCanvasElement
    ): boolean {
        const w = after.width, h = after.height;
        const ctxA = document.createElement("canvas").getContext("2d");
        const ctxB = after.getContext("2d");
        ctxA.canvas.width = w; ctxA.canvas.height = h;
        ctxA.drawImage(before as CanvasImageSource, 0, 0);
        const dA = ctxA.getImageData(0, 0, w, h).data;
        const dB = ctxB.getImageData(0, 0, w, h).data;
        for (let i = 0; i < dA.length; i++) if (dA[i] !== dB[i]) return true;
        return false;
    }

    private _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }

    // ── 유틸 ──────────────────────────────────────────────────────────────

    private _swapAnim(filePath: string, anim: string): string {
        const parts     = filePath.split('/');
        const lastNoExt = parts[parts.length - 1].replace('.png', '');
        if (ANIMS[lastNoExt] !== undefined) {
            parts[parts.length - 1] = anim + '.png';
        } else {
            for (let i = parts.length - 2; i >= 0; i--) {
                if (ANIMS[parts[i]] !== undefined) { parts[i] = anim; break; }
            }
        }
        return parts.join('/');
    }

    private _extractBaseAnim(animName: string): string | null {
        const parts = animName.split('_');
        for (let i = 1; i <= parts.length; i++) {
            const candidate = parts.slice(0, i).join('_');
            if (ANIMS[candidate] !== undefined) return candidate;
        }
        return null;
    }

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
        let current: HTMLImageElement | HTMLCanvasElement = img;

        for (const g of matGroups) {
            if (!g.baseHex || !g.recolorHex) continue;
            current = this._swapPalette(current, g.baseHex, g.recolorHex);
        }

        return current;
    }
}
