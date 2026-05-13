import { CAnimation, CClipCoodi, CClipImg } from "../../../artgine/app/component/CAnimation.js";
import { CH5CanvasInst } from "../../../artgine/render/CH5Canvas.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CParser } from "../../../artgine/util/parser/CParser.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CObject } from "../../basic/CObject.js";
const ANIMS = {
    spellcast: { f: 7 },
    thrust: { f: 8 },
    walk: { f: 9 },
    slash: { f: 6 },
    shoot: { f: 13 },
    hurt: { f: 6 },
    climb: { f: 6 },
    idle: { f: 2 },
    jump: { f: 5 },
    sit: { f: 3 },
    emote: { f: 3 },
    run: { f: 8 },
    combat_idle: { f: 2 },
    backslash: { f: 13 },
    halfslash: { f: 6 },
};
const ANIM_YOFFSETS = {
    spellcast: 0, thrust: 256, walk: 512, slash: 768,
    shoot: 1024, hurt: 1280, climb: 1344, idle: 1408,
    jump: 1664, sit: 1920, emote: 2176, run: 2432,
    combat_idle: 2688, backslash: 2944, halfslash: 3200,
};
const ONE_DIR_ANIMS = new Set(['hurt', 'climb']);
function getDirArr(dir, animName) {
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
const FRAME_SIZE = 64;
const PALETTE_META = {
    cloth: { version: "ulpc", base: "white" },
    body: { version: "ulpc", base: "light" },
    metal: { version: "ulpc", base: "steel" },
    hair: { version: "ulpc", base: "orange" },
    eye: { version: "ulpc", base: "blue" },
    all: { version: "lpcr", base: "white" },
};
const TYPE_MATERIAL = {
    clothes: ["cloth"],
    torso: ["cloth"],
    shoulders: ["cloth", "metal"],
    body: ["body"],
    head: ["body"],
    expression: ["body"],
    face: ["body"],
    hair: ["hair"],
    eyes: ["eye"],
};
const PALETTE_FALLBACK_ORDER = ["cloth", "body", "metal", "hair", "eye"];
export class CULPC extends CObject {
    static eState = {
        "walk": "walk",
        "slash": "slash",
        "thrush": "thrush",
        "idle": "idle"
    };
    mAniMap = new Map();
    mTexture = null;
    static AniGroups = [
        ["walk", "move"],
        ["slash", "thrush", "attack"],
        ["idle", "basic"]
    ];
    static FallbackMap = CULPC._CreateBidirectionalMap(CULPC.AniGroups);
    static _CreateBidirectionalMap(groups) {
        const map = {};
        for (const group of groups) {
            for (const state of group) {
                map[state] = group.filter(s => s !== state);
            }
        }
        return map;
    }
    _FindAniByState(state, dir, beforeDir) {
        let value = this.mAniMap.get(state + "_" + dir);
        if (value != null)
            return value;
        value = this.mAniMap.get(state + "_" + beforeDir);
        if (value != null)
            return value;
        for (const [key, val] of this.mAniMap) {
            if (key.startsWith(state))
                return val;
        }
        return null;
    }
    GetAni(_state, _dir, _beforeDir = 0) {
        let ani = this._FindAniByState(_state, _dir, _beforeDir);
        if (ani != null)
            return ani;
        const fallbackStates = CULPC.FallbackMap[_state];
        if (fallbackStates != null) {
            for (const fallbackState of fallbackStates) {
                ani = this._FindAniByState(fallbackState, _dir, _beforeDir);
                if (ani != null)
                    return ani;
            }
        }
        for (const val of this.mAniMap.values()) {
            return val;
        }
        return null;
    }
}
var gResPath = null;
export class CParserULPC extends CParser {
    mResBase = null;
    mFrameDelay = 0.125;
    mAnimFilter = null;
    constructor(animKeys = null) {
        super();
        this.mAnimFilter = animKeys;
    }
    static SetGlobalResBase(_path) {
        gResPath = _path;
    }
    static sPaletteCache = new Map();
    GetResult() { return this.mResult; }
    async Load(pa_fileName) {
        if (!this.mBuffer)
            await this.Open(pa_fileName);
        const rawJson = JSON.parse(new TextDecoder().decode(this.mBuffer));
        const json = Array.isArray(rawJson)
            ? rawJson.reduce((merged, obj) => {
                for (const [k, v] of Object.entries(obj)) {
                    if (Array.isArray(v))
                        merged[k] = [...(merged[k] ?? []), ...v];
                    else if (!(k in merged))
                        merged[k] = v;
                }
                return merged;
            }, {})
            : rawJson;
        const resBase = this.mResBase || gResPath || json.mresBase || "./";
        const absRoot = new URL(resBase, location.href).toString();
        const rootSlash = absRoot.endsWith('/') ? absRoot : absRoot + '/';
        const absBase = new URL(json.resBase ?? "spritesheets", rootSlash).toString().replace(/\/$/, "");
        const result = new CULPC();
        const cv = new CH5CanvasInst();
        let textureFile = pa_fileName.replace(/\.json$/i, ".ulpc");
        let specs;
        if (Array.isArray(json.selections)) {
            specs = await this._buildV3(json, absBase, cv);
        }
        else {
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
    _buildAnimMap(specs, result, textureFile) {
        for (const s of specs) {
            const cAnim = new CAnimation();
            const scaleVec = s.scale !== 1 ? new CVec2(s.scale, s.scale) : undefined;
            cAnim.Push(new CClipImg(0, 0, textureFile));
            for (let f = s.frameStart; f < s.frameCount; f++) {
                const stX = f * s.frameSize;
                const stY = s.yOffset;
                cAnim.Push(new CClipCoodi(-1, this.mFrameDelay, stX, stY, stX + s.frameSize, stY + s.frameSize, scaleVec));
            }
            result.mAniMap.set(s.key, cAnim);
        }
    }
    async _buildV2(json, absBase, paletteBase, cv) {
        const layers = [...(json.layers ?? [])].sort((a, b) => a.zPos - b.zPos);
        const sizeBase = json.sizeBase ?? FRAME_SIZE;
        const oversizeSections = [];
        const seenAnim = new Set();
        for (const layer of layers) {
            if ((layer.size ?? FRAME_SIZE) <= sizeBase)
                continue;
            const supported = layer.supportedAnimations ?? [];
            for (const animName of supported) {
                if (seenAnim.has(animName))
                    continue;
                const baseAnim = this._extractBaseAnim(animName);
                if (!baseAnim)
                    continue;
                seenAnim.add(animName);
                const dirArr = getDirArr(layer.dir, animName);
                oversizeSections.push({
                    animName, baseAnim,
                    frameSize: layer.size,
                    cols: layer.frame,
                    dirArr,
                    yOffset: 0, idleYOffset: 0,
                });
            }
        }
        const animYMap = new Map();
        let stackY = 0;
        for (const animName of ANIM_ORDER) {
            const supportingLayer = layers.find(l => (l.size ?? FRAME_SIZE) <= sizeBase &&
                (l.supportedAnimations ?? []).includes(animName));
            if (!supportingLayer)
                continue;
            const dirs = getDirArr(supportingLayer.dir, animName);
            animYMap.set(animName, { y: stackY, dirs });
            stackY += dirs.length * sizeBase;
        }
        const idleDirs = animYMap.get("idle")?.dirs ?? [0, 2, 1, 3];
        const idleF = ANIMS["idle"].f;
        let canvasW = COMPOSITE_W;
        let canvasH = stackY;
        for (const sec of oversizeSections) {
            sec.yOffset = canvasH;
            if (sec.cols * sec.frameSize > canvasW)
                canvasW = sec.cols * sec.frameSize;
            canvasH += sec.dirArr.length * sec.frameSize;
            sec.idleYOffset = canvasH;
            if (idleF * sec.frameSize > canvasW)
                canvasW = idleF * sec.frameSize;
            canvasH += idleDirs.length * sec.frameSize;
        }
        cv.Init(canvasW, canvasH, false, false);
        await cv.Draw();
        const ctx = cv.GetContext();
        ctx.imageSmoothingEnabled = false;
        const pendingFallbacks = [];
        for (const [animName, { y: dstY }] of animYMap) {
            for (const layer of layers) {
                const supported = layer.supportedAnimations ?? [];
                const isOversize = supported.some(a => seenAnim.has(a));
                if (isOversize)
                    continue;
                if (supported.length > 0 && !supported.includes(animName)) {
                    if (animName !== "idle")
                        continue;
                    const fallback = ["walk", "hurt", ...supported]
                        .find(a => supported.includes(a) && ANIMS[a] !== undefined);
                    if (!fallback)
                        continue;
                    const url = absBase + "/" + this._swapAnim(layer.fileName, fallback);
                    pendingFallbacks.push({ url, layer, dstY });
                    continue;
                }
                const url = absBase + "/" + this._swapAnim(layer.fileName, animName);
                const img = await this._loadAndRecolor(url, layer, paletteBase);
                if (img)
                    ctx.drawImage(img, 0, dstY);
            }
        }
        for (const { url, layer, dstY } of pendingFallbacks) {
            const img = await this._loadAndRecolor(url, layer, paletteBase);
            if (!img)
                continue;
            for (let d = 0; d < idleDirs.length; d++) {
                const srcY = d * sizeBase;
                const rowY = dstY + d * sizeBase;
                for (let f = 0; f < idleF; f++) {
                    ctx.drawImage(img, 0, srcY, sizeBase, sizeBase, f * sizeBase, rowY, sizeBase, sizeBase);
                }
            }
        }
        for (const sec of oversizeSections) {
            const { animName, baseAnim, frameSize, cols, dirArr, yOffset } = sec;
            const offset = (frameSize - sizeBase) / 2;
            const reversed = animName.includes('_reverse');
            for (const layer of layers) {
                const supported = layer.supportedAnimations ?? [];
                let oversizeImg = null;
                if (supported.includes(animName)) {
                    oversizeImg = await this._loadAndRecolor(absBase + "/" + layer.fileName, layer, paletteBase);
                }
                if (oversizeImg) {
                    for (let d = 0; d < dirArr.length; d++)
                        for (let f = 0; f < cols; f++)
                            ctx.drawImage(oversizeImg, f * frameSize, d * frameSize, frameSize, frameSize, f * frameSize, yOffset + d * frameSize, frameSize, frameSize);
                }
                else if (supported.length === 0 || supported.includes(baseAnim)) {
                    const stdImg = await this._loadAndRecolor(absBase + "/" + this._swapAnim(layer.fileName, baseAnim), layer, paletteBase);
                    if (!stdImg)
                        continue;
                    for (let d = 0; d < dirArr.length; d++)
                        for (let f = 0; f < cols; f++) {
                            const srcF = reversed ? (cols - 1 - f) : f;
                            ctx.drawImage(stdImg, srcF * sizeBase, d * sizeBase, sizeBase, sizeBase, f * frameSize + offset, yOffset + d * frameSize + offset, sizeBase, sizeBase);
                        }
                }
            }
        }
        for (const sec of oversizeSections) {
            const { animName, baseAnim, frameSize, idleYOffset } = sec;
            const offset = (frameSize - sizeBase) / 2;
            for (const layer of layers) {
                const supported = layer.supportedAnimations ?? [];
                const isOversizeForThis = supported.includes(animName);
                const isOversizeForOther = supported.some(a => seenAnim.has(a) && a !== animName);
                if (isOversizeForOther)
                    continue;
                if (isOversizeForThis) {
                    const oversizeAnim = supported.find(a => seenAnim.has(a)) ?? animName;
                    const walkUrl = absBase + "/" + layer.fileName.replace(`/${oversizeAnim}/`, `/${baseAnim}/`);
                    const img = await this._loadAndRecolor(walkUrl, layer, paletteBase);
                    if (!img)
                        continue;
                    for (let d = 0; d < idleDirs.length; d++)
                        for (let f = 0; f < idleF; f++)
                            ctx.drawImage(img, 0, d * frameSize, frameSize, frameSize, f * frameSize, idleYOffset + d * frameSize, frameSize, frameSize);
                }
                else if (supported.length === 0 || supported.includes(baseAnim)) {
                    const canUseIdle = supported.length === 0 || supported.includes("idle");
                    const srcAnim = canUseIdle ? "idle" : baseAnim;
                    const srcUrl = absBase + "/" + this._swapAnim(layer.fileName, srcAnim);
                    const img = await this._loadAndRecolor(srcUrl, layer, paletteBase);
                    if (!img)
                        continue;
                    for (let d = 0; d < idleDirs.length; d++)
                        for (let f = 0; f < idleF; f++) {
                            const srcF = canUseIdle ? f : 0;
                            ctx.drawImage(img, srcF * sizeBase, d * sizeBase, sizeBase, sizeBase, f * frameSize + offset, idleYOffset + d * frameSize + offset, sizeBase, sizeBase);
                        }
                }
            }
        }
        const specs = [];
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
            const scale = frameSize / sizeBase;
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
    async _buildV3(json, absBase, cv) {
        const rawEntries = [];
        for (let si = 0; si < json.selections.length; si++) {
            const sel = json.selections[si];
            const recolors = sel.recolors ?? {};
            const files = sel.files ?? [];
            const base64s = sel.base64s ?? [];
            for (let fi = 0; fi < files.length; fi++) {
                const e = this._parseNEntry(files[fi], recolors, si);
                if (!e)
                    continue;
                if (base64s[fi])
                    e.base64 = base64s[fi];
                rawEntries.push(e);
            }
        }
        const preferred = new Map();
        for (const e of rawEntries) {
            const g0 = e.matGroups[0];
            const matKey = g0.material && g0.version ? `${g0.material}.${g0.version}` : 'default';
            const key = `${e.selIdx}|${e.animName}|${e.zPos}|${matKey}`;
            if (!preferred.has(key)) {
                preferred.set(key, e);
            }
            else {
                const curG0 = preferred.get(key).matGroups[0];
                const selObj = json.selections[e.selIdx];
                if (matKey === 'variant.v1') {
                    const want = selObj?.recolors?.['variant.v1']?.color ?? null;
                    if (g0.fileColor === want && curG0.fileColor !== want)
                        preferred.set(key, e);
                }
                else if (g0.material && PALETTE_META[g0.material]) {
                    const want = PALETTE_META[g0.material].base;
                    if (g0.fileColor === want && curG0.fileColor !== want)
                        preferred.set(key, e);
                }
            }
        }
        const hasRecolor = new Set();
        for (const key of preferred.keys()) {
            if (!key.endsWith('|default')) {
                hasRecolor.add(key.substring(0, key.lastIndexOf('|')));
            }
        }
        const entries = [];
        for (const [key, e] of preferred) {
            if (key.endsWith('|default')) {
                const pos = key.substring(0, key.lastIndexOf('|'));
                if (hasRecolor.has(pos))
                    continue;
            }
            entries.push(e);
        }
        const byAnim = new Map();
        for (const e of entries) {
            if (e.animName === 'all')
                continue;
            if (!byAnim.has(e.animName))
                byAnim.set(e.animName, []);
            byAnim.get(e.animName).push(e);
        }
        for (const arr of byAnim.values())
            arr.sort((a, b) => a.zPos - b.zPos);
        if (this.mAnimFilter) {
            const allowed = new Set(this.mAnimFilter);
            for (const key of byAnim.keys()) {
                if (!allowed.has(key))
                    byAnim.delete(key);
            }
        }
        const animYMap = new Map();
        let canvasH = 0, canvasW = 0;
        for (const [anim, arr] of byAnim) {
            const dirs = arr[0].dirArr;
            const minFC = Math.min(...arr.map(e => e.frameCount));
            const maxFC = Math.max(...arr.map(e => e.frameCount));
            const minFS = Math.min(...arr.map(e => e.frameSize));
            const maxFS = Math.max(...arr.map(e => e.frameSize));
            animYMap.set(anim, { y: canvasH, dirs, frameCount: minFC, frameSize: maxFS, minFS });
            canvasW = Math.max(canvasW, maxFC * maxFS);
            canvasH += dirs.length * maxFS;
        }
        cv.Init(canvasW || 1, canvasH || 1, false, false);
        await cv.Draw();
        const ctx = cv.GetContext();
        ctx.imageSmoothingEnabled = false;
        for (const [anim, { y: dstY, dirs, frameCount, frameSize: maxFS }] of animYMap) {
            for (const e of byAnim.get(anim)) {
                const rawPath = this._encodeNPath(e.fullPath);
                const url = /^https?:\/\//i.test(e.fullPath) ? rawPath : absBase + '/' + rawPath;
                const img = await this._loadImg(e.base64 ?? url);
                if (!img)
                    continue;
                const rc = await this._applyNRecolor(img, e.matGroups);
                const offset = (maxFS - e.frameSize) / 2;
                for (let d = 0; d < dirs.length; d++) {
                    const rowY = dstY + d * maxFS;
                    for (let f = 0; f < e.frameCount; f++)
                        ctx.drawImage(rc, f * e.frameSize, d * e.frameSize, e.frameSize, e.frameSize, f * maxFS + offset, rowY + offset, e.frameSize, e.frameSize);
                }
            }
        }
        const specs = [];
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
    async _loadAndRecolor(url, layer, paletteBase) {
        const recolors = layer.recolors ?? null;
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
            if (variantUrl !== url)
                return this._loadImg(variantUrl);
        }
        return null;
    }
    _toVariantUrl(url, colorName) {
        if (!colorName)
            return url;
        return url.replace(/\/([^/]+)\.png$/i, `/$1/${colorName}.png`);
    }
    _parseRecolorKey(key) {
        const parts = key.split('.');
        if (parts.length === 3)
            return { material: parts[0], version: parts[1], color: parts[2] };
        if (parts.length === 2)
            return { material: parts[0], version: null, color: parts[1] };
        return { material: null, version: null, color: parts[0] };
    }
    async _applyRecolors(img, recolors, paletteBase) {
        let current = img;
        let changed = false;
        for (const [typeName, targetColor] of Object.entries(recolors)) {
            const parsed = this._parseRecolorKey(targetColor);
            const tgtMaterial = parsed.material ?? (TYPE_MATERIAL[typeName]?.[0] ?? "cloth");
            const tgtVersion = parsed.version ?? PALETTE_META[tgtMaterial]?.version;
            const tgtPalette = await this._fetchPalette(tgtMaterial, paletteBase, tgtVersion);
            if (!tgtPalette)
                continue;
            const dstColors = tgtPalette[parsed.color];
            if (!dstColors)
                continue;
            const srcCandidates = [
                ...(parsed.material ? [parsed.material] : []),
                ...(TYPE_MATERIAL[typeName] ?? []),
                ...PALETTE_FALLBACK_ORDER,
            ].filter((m, i, arr) => arr.indexOf(m) === i);
            for (const srcMaterial of srcCandidates) {
                const srcVersion = PALETTE_META[srcMaterial]?.version;
                const srcPalette = await this._fetchPalette(srcMaterial, paletteBase, srcVersion);
                if (!srcPalette)
                    continue;
                const srcBase = PALETTE_META[srcMaterial]?.base ?? "white";
                if (srcMaterial === tgtMaterial && srcBase === parsed.color)
                    continue;
                const srcColors = srcPalette[srcBase];
                if (!srcColors)
                    continue;
                const result = this._swapPalette(current, srcColors, dstColors);
                if (this._hasChanged(current, result)) {
                    current = result;
                    changed = true;
                }
            }
        }
        return changed ? current : null;
    }
    async _fetchPalette(material, paletteBase, version) {
        const meta = PALETTE_META[material];
        const ver = version ?? meta?.version;
        if (!ver)
            return null;
        const cacheKey = `${material}_${ver}`;
        if (CParserULPC.sPaletteCache.has(cacheKey))
            return CParserULPC.sPaletteCache.get(cacheKey);
        const url = `${paletteBase}${material}/${material}_${ver}.json`;
        try {
            const resp = await fetch(url);
            if (!resp.ok)
                return null;
            const data = await resp.json();
            CParserULPC.sPaletteCache.set(cacheKey, data);
            return data;
        }
        catch {
            return null;
        }
    }
    _swapPalette(src, srcColors, dstColors) {
        const w = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth;
        const h = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight;
        const tmp = document.createElement("canvas");
        tmp.width = w;
        tmp.height = h;
        const tmpCtx = tmp.getContext("2d");
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.drawImage(src, 0, 0);
        const imgData = tmpCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const pairs = [];
        for (let i = 0; i < srcColors.length && i < dstColors.length; i++) {
            const s = this._hexToRgb(srcColors[i]);
            const d = this._hexToRgb(dstColors[i]);
            if (s && d)
                pairs.push({ sr: s.r, sg: s.g, sb: s.b, dr: d.r, dg: d.g, db: d.b });
        }
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0)
                continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            for (const p of pairs) {
                if (Math.abs(r - p.sr) <= 1 && Math.abs(g - p.sg) <= 1 && Math.abs(b - p.sb) <= 1) {
                    data[i] = p.dr;
                    data[i + 1] = p.dg;
                    data[i + 2] = p.db;
                    break;
                }
            }
        }
        tmpCtx.putImageData(imgData, 0, 0);
        return tmp;
    }
    _hasChanged(before, after) {
        const w = after.width, h = after.height;
        const ctxA = document.createElement("canvas").getContext("2d");
        const ctxB = after.getContext("2d");
        ctxA.canvas.width = w;
        ctxA.canvas.height = h;
        ctxA.drawImage(before, 0, 0);
        const dA = ctxA.getImageData(0, 0, w, h).data;
        const dB = ctxB.getImageData(0, 0, w, h).data;
        for (let i = 0; i < dA.length; i++)
            if (dA[i] !== dB[i])
                return true;
        return false;
    }
    _hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }
    _swapAnim(filePath, anim) {
        const parts = filePath.split('/');
        const lastNoExt = parts[parts.length - 1].replace('.png', '');
        if (ANIMS[lastNoExt] !== undefined) {
            parts[parts.length - 1] = anim + '.png';
        }
        else {
            for (let i = parts.length - 2; i >= 0; i--) {
                if (ANIMS[parts[i]] !== undefined) {
                    parts[i] = anim;
                    break;
                }
            }
        }
        return parts.join('/');
    }
    _extractBaseAnim(animName) {
        const parts = animName.split('_');
        for (let i = 1; i <= parts.length; i++) {
            const candidate = parts.slice(0, i).join('_');
            if (ANIMS[candidate] !== undefined)
                return candidate;
        }
        return null;
    }
    _loadImg(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }
    _encodeNPath(path) {
        return path.split('/').map(seg => seg.replace(/\[/g, '%5B').replace(/\]/g, '%5D')).join('/');
    }
    _parseNEntry(filePath, recolors, selIdx) {
        const segs = filePath.split('/');
        const aIdx = segs.findIndex(s => /^a\[/.test(s));
        if (aIdx < 0)
            return null;
        const am = segs[aIdx].match(/^a\[(.+?)\](?:_(\d+))?$/);
        if (!am)
            return null;
        const animName = am[1];
        const yOffset = am[2] !== undefined ? parseInt(am[2], 10) : 0;
        const zSeg = segs[aIdx + 1];
        if (!zSeg?.startsWith('z'))
            return null;
        const zPos = parseInt(zSeg.slice(1), 10);
        const fname = segs[aIdx + 2];
        if (!fname)
            return null;
        const parsed = this._parseNFilename(fname, recolors);
        if (!parsed)
            return null;
        parsed.dirArr = this._parseDirsStr(parsed._dirs ?? null);
        return { selIdx, animName, yOffset, zPos, ...parsed, fullPath: filePath };
    }
    _parseNFilename(fname, recolors) {
        const noext = fname.replace(/\.png$/i, '');
        const tokens = noext.split('_');
        if (tokens.length < 2)
            return null;
        const t = [...tokens];
        const dirsStr = t.pop();
        if (!/^[0-3]+$/.test(dirsStr))
            return null;
        const dirs = dirsStr;
        const frameCount = parseInt(t.pop(), 10);
        const frameSize = parseInt(t.pop(), 10);
        if (isNaN(frameCount) || isNaN(frameSize) || t.length === 0)
            return null;
        const matGroups = this._parsePaletteGroups(t, recolors);
        return { matGroups, frameSize, frameCount, _dirs: dirs, dirArr: [] };
    }
    _parseDirsStr(dirs) {
        if (dirs && /^[0-3]+$/.test(dirs))
            return dirs.split('').map(Number);
        return [];
    }
    _parsePaletteGroups(tokens, recolors) {
        const groups = [];
        let cur = null;
        for (const tok of tokens) {
            const dots = (tok.match(/\./g) || []).length;
            if (dots >= 2) {
                if (cur)
                    groups.push(cur);
                const parts = tok.split('.');
                const material = parts[0];
                const version = parts[1];
                const fileColor = parts.slice(2).join('.');
                const matKey = `${material}.${version}`;
                const rc = recolors[matKey] ?? null;
                cur = { material, version, fileColor, baseHex: rc?.base ?? null, recolorHex: rc?.recolor ?? null };
            }
            else if (dots === 0 && cur) {
                cur.fileColor += '_' + tok;
            }
        }
        if (cur)
            groups.push(cur);
        if (groups.length === 0)
            groups.push({ material: null, version: null, fileColor: tokens.join('_'), baseHex: null, recolorHex: null });
        return groups;
    }
    async _applyNRecolor(img, matGroups) {
        let current = img;
        for (const g of matGroups) {
            if (!g.baseHex || !g.recolorHex)
                continue;
            current = this._swapPalette(current, g.baseHex, g.recolorHex);
        }
        return current;
    }
}
