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
        "idle":"idle",
        "shoot":"shoot",
        
        "spellcast":"spellcast"
        
    };
    mAniMap = new Map<string, CAnimation>();
    mTexture: CTexture | null = null;

    // 1. 연관된 애니메이션들을 '그룹'으로 묶어줍니다.
    static AniGroups: string[][] = [
        ["walk", "move"],         // 이동 계열
        ["slash", "thrush", "attack","spellcast","shoot"],   // 공격 계열
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
            

            let specs: AnimClipSpec[];
            if (Array.isArray(json.selections)) {
                // V3: selections[] 기반 (ulpc_selection.json)
                specs = await this._buildV3(json, absBase, cv);
            } else {
                // V2: layers[] 기반 (sample.json)
                const paletteBase = rootSlash ? new URL("../palette_definitions/", rootSlash).toString() : "palette_definitions/";
                specs = await this._buildV2(json, absBase, paletteBase, cv);
            }

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

        // ── 5. 이미지 로드 및 리컬러링 병렬 처리 ────────────────────────────
        // V2 로직에서도 모든 조합에 대해 미리 로드/리컬러링을 병렬로 수행
        const loadTasks: Promise<{ key: string; img: CanvasImageSource | null }>[] = [];
        const taskKeys = new Set<string>();

        // 표준 애니메이션용 작업 수집
        for (const [animName, { y: dstY }] of animYMap) {
            for (const layer of layers) {
                const supported: string[] = layer.supportedAnimations ?? [];
                const isOversize = supported.some(a => seenAnim.has(a));
                if (isOversize) continue;

                let url: string;
                if (supported.length > 0 && !supported.includes(animName)) {
                    if (animName !== "idle") continue;
                    const fallback = ["walk", "hurt", ...supported]
                        .find(a => supported.includes(a) && ANIMS[a] !== undefined);
                    if (!fallback) continue;
                    url = absBase + "/" + this._swapAnim(layer.fileName, fallback);
                } else {
                    url = absBase + "/" + this._swapAnim(layer.fileName, animName);
                }

                const taskKey = `${url}|${JSON.stringify(layer.recolors ?? {})}`;
                if (!taskKeys.has(taskKey)) {
                    taskKeys.add(taskKey);
                    loadTasks.push(this._loadAndRecolor(url, layer, paletteBase).then(img => ({ key: taskKey, img })));
                }
            }
        }

        // 오버사이즈용 작업 수집
        for (const sec of oversizeSections) {
            const { animName, baseAnim } = sec;
            for (const layer of layers) {
                const supported: string[] = layer.supportedAnimations ?? [];
                
                // 정식 지원
                if (supported.includes(animName)) {
                    const url = absBase + "/" + layer.fileName;
                    const taskKey = `${url}|${JSON.stringify(layer.recolors ?? {})}`;
                    if (!taskKeys.has(taskKey)) {
                        taskKeys.add(taskKey);
                        loadTasks.push(this._loadAndRecolor(url, layer, paletteBase).then(img => ({ key: taskKey, img })));
                    }
                }
                
                // Fallback (baseAnim 사용)
                if (supported.length === 0 || supported.includes(baseAnim)) {
                    const url = absBase + "/" + this._swapAnim(layer.fileName, baseAnim);
                    const taskKey = `${url}|${JSON.stringify(layer.recolors ?? {})}`;
                    if (!taskKeys.has(taskKey)) {
                        taskKeys.add(taskKey);
                        loadTasks.push(this._loadAndRecolor(url, layer, paletteBase).then(img => ({ key: taskKey, img })));
                    }
                }

                // Idle Fallback
                const isOversizeForOther = supported.some(a => seenAnim.has(a) && a !== animName);
                if (!isOversizeForOther) {
                    const isOversizeForThis = supported.includes(animName);
                    if (isOversizeForThis) {
                        const oversizeAnim = supported.find(a => seenAnim.has(a)) ?? animName;
                        const walkUrl = absBase + "/" + layer.fileName.replace(`/${oversizeAnim}/`, `/${baseAnim}/`);
                        const taskKey = `${walkUrl}|${JSON.stringify(layer.recolors ?? {})}`;
                        if (!taskKeys.has(taskKey)) {
                            taskKeys.add(taskKey);
                            loadTasks.push(this._loadAndRecolor(walkUrl, layer, paletteBase).then(img => ({ key: taskKey, img })));
                        }
                    } else if (supported.length === 0 || supported.includes(baseAnim)) {
                        const canUseIdle = supported.length === 0 || supported.includes("idle");
                        const srcAnim    = canUseIdle ? "idle" : baseAnim;
                        const srcUrl     = absBase + "/" + this._swapAnim(layer.fileName, srcAnim);
                        const taskKey = `${srcUrl}|${JSON.stringify(layer.recolors ?? {})}`;
                        if (!taskKeys.has(taskKey)) {
                            taskKeys.add(taskKey);
                            loadTasks.push(this._loadAndRecolor(srcUrl, layer, paletteBase).then(img => ({ key: taskKey, img })));
                        }
                    }
                }
            }
        }

        const results = await Promise.all(loadTasks);
        const imgCache = new Map<string, CanvasImageSource | null>();
        for (const res of results) imgCache.set(res.key, res.img);

        const getCachedImg = (url: string, layer: any) => {
            const key = `${url}|${JSON.stringify(layer.recolors ?? {})}`;
            return imgCache.get(key) ?? null;
        };

        // ── 6. 표준 섹션 드로잉 ──────────────────────────────────────────
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
                const img = getCachedImg(url, layer);
                if (img) ctx.drawImage(img, 0, dstY);
            }
        }

        // ── 5.5. idle fallback: frame-0 spread ───────────────────────────
        for (const { url, layer, dstY } of pendingFallbacks) {
            const img = getCachedImg(url, layer);
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
                    oversizeImg = getCachedImg(absBase + "/" + layer.fileName, layer);
                }

                if (oversizeImg) {
                    for (let d = 0; d < dirArr.length; d++)
                        for (let f = 0; f < cols; f++)
                            ctx.drawImage(oversizeImg,
                                f * frameSize, d * frameSize, frameSize, frameSize,
                                f * frameSize, yOffset + d * frameSize, frameSize, frameSize);
                } else if (supported.length === 0 || supported.includes(baseAnim)) {
                    const url = absBase + "/" + this._swapAnim(layer.fileName, baseAnim);
                    const stdImg = getCachedImg(url, layer);
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
                    const img = getCachedImg(walkUrl, layer);
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
                    const img = getCachedImg(srcUrl, layer);
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

    // ── V2 팔레트 리컬러 ──────────────────────────────────────────────────

    private async _loadAndRecolor(
        url: string,
        layer: any,
        paletteBase: string
    ): Promise<CanvasImageSource | null> {
        const recolors: Record<string, string> | null = layer.recolors ?? null;

        const recolorKey = JSON.stringify(recolors || {});
        const cacheKey = `${url}|${recolorKey}|${paletteBase}`;
        if (CParserULPC.sRecolorCache.has(cacheKey)) return CParserULPC.sRecolorCache.get(cacheKey)!;

        if (!recolors || Object.keys(recolors).length === 0) {
            const img = await this._loadImg(url);
            if (img) CParserULPC.sRecolorCache.set(cacheKey, img);
            return img;
        }

        const img = await this._loadImg(url);
        if (img) {
            const swapped = await this._applyRecolors(img, recolors, paletteBase);
            const res = swapped ?? img;
            CParserULPC.sRecolorCache.set(cacheKey, res);
            return res;
        }

        const firstColor = Object.values(recolors)[0];
        if (firstColor) {
            const variantUrl = this._toVariantUrl(url, firstColor);
            if (variantUrl !== url) {
                const res = await this._loadImg(variantUrl);
                if (res) CParserULPC.sRecolorCache.set(cacheKey, res);
                return res;
            }
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
                if (result) { 
                    current = result; 
                    changed = true; 
                    // Break since we found a matching source material and applied it
                    break;
                }
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

            const dst32 = (255 << 24) | (d.b << 16) | (d.g << 8) | d.r;
            // Populate +/- 1 tolerance (3x3x3 = 27 entries per color)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dg = -1; dg <= 1; dg++) {
                    for (let db = -1; db <= 1; db++) {
                        const r = Math.max(0, Math.min(255, s.r + dr));
                        const g = Math.max(0, Math.min(255, s.g + dg));
                        const b = Math.max(0, Math.min(255, s.b + db));
                        const src32 = (255 << 24) | (b << 16) | (g << 8) | r;
                        map.set(src32, dst32);
                    }
                }
            }
        }
        CParserULPC.sColorMapCache.set(key, map);
        return map;
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
