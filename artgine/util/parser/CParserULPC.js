import { CAnimation, CClipCoodi, CClipImg } from "../../../artgine/app/component/CAnimation.js";
import { CH5CanvasInst } from "../../../artgine/render/CH5Canvas.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CParser } from "../../../artgine/util/parser/CParser.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CObject } from "../../basic/CObject.js";
const PALETTE_META = {
    cloth: { version: "ulpc", base: "white" },
    body: { version: "ulpc", base: "light" },
    metal: { version: "ulpc", base: "steel" },
    hair: { version: "ulpc", base: "orange" },
    eye: { version: "ulpc", base: "blue" },
    all: { version: "lpcr", base: "white" },
};
export class CULPC extends CObject {
    static eState = {
        "walk": "walk",
        "slash": "slash",
        "thrust": "thrust",
        "idle": "idle",
        "shoot": "shoot",
        "spellcast": "spellcast"
    };
    mAniMap = new Map();
    mTexture = null;
    static AniGroups = [
        ["walk", "move"],
        ["slash", "thrust", "attack", "spellcast", "shoot"],
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
    mFrameDelay = 0.125;
    mAnimFilter = null;
    mTempNRecolorCache = new Map();
    constructor(animKeys = null) {
        super();
        this.mAnimFilter = animKeys;
    }
    static SetGlobalResBase(_path) {
        gResPath = _path;
    }
    static sPaletteCache = new Map();
    static sRecolorCache = new Map();
    GetResult() { return this.mResult; }
    async Load(pa_fileName) {
        try {
            if (!this.mBuffer)
                await this.Open(pa_fileName);
            const rawJson = JSON.parse(new TextDecoder().decode(this.mBuffer));
            const applyResBase = (obj) => {
                const base = obj.resBase ?? gResPath;
                if (!base)
                    return;
                const rootSlash = base.endsWith('/') ? base : base + '/';
                if (Array.isArray(obj.selections)) {
                    for (const sel of obj.selections) {
                        if (Array.isArray(sel.files)) {
                            sel.files = sel.files.map((f) => /^https?:\/\//i.test(f) ? f : rootSlash + f);
                        }
                    }
                }
            };
            let json;
            if (Array.isArray(rawJson)) {
                for (const obj of rawJson)
                    applyResBase(obj);
                json = rawJson.reduce((merged, obj) => {
                    for (const [k, v] of Object.entries(obj)) {
                        if (Array.isArray(v))
                            merged[k] = [...(merged[k] ?? []), ...v];
                        else if (!(k in merged))
                            merged[k] = v;
                    }
                    return merged;
                }, {});
            }
            else {
                applyResBase(rawJson);
                json = rawJson;
            }
            const resBase = json.resBase ?? gResPath ?? "";
            const rootSlash = resBase ? (resBase.endsWith('/') ? resBase : resBase + '/') : "";
            const absBase = rootSlash.replace(/\/$/, "");
            const result = new CULPC();
            const cv = new CH5CanvasInst();
            let textureFile = pa_fileName.replace(/\.json$/i, ".ulpc");
            const specs = await this._buildV3(json, absBase, cv);
            this._buildAnimMap(specs, result, textureFile);
            result.mTexture = cv.GetNewTex();
            result.mTexture.SetMipMap(CTexture.eMipmap.GL);
            this.mResult = result;
            result.SetKey(this.mFileName);
            result.mTexture.SetKey(textureFile);
        }
        finally {
            this.mTempNRecolorCache.clear();
        }
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
        const processTasks = entries.map(async (e) => {
            const url = this._encodeNPath(e.fullPath);
            const img = await this._loadImg(e.base64 ?? url);
            if (!img)
                return { entry: e, img: null };
            const rc = await this._applyNRecolor(img, e.matGroups);
            return { entry: e, img: rc };
        });
        const results = await Promise.all(processTasks);
        const imgMap = new Map();
        for (const res of results)
            imgMap.set(res.entry, res.img);
        for (const [anim, { y: dstY, dirs, frameSize: maxFS }] of animYMap) {
            for (const e of byAnim.get(anim)) {
                const img = imgMap.get(e);
                if (!img)
                    continue;
                const offset = (maxFS - e.frameSize) / 2;
                for (let d = 0; d < dirs.length; d++) {
                    const rowY = dstY + d * maxFS;
                    for (let f = 0; f < e.frameCount; f++)
                        ctx.drawImage(img, f * e.frameSize, d * e.frameSize, e.frameSize, e.frameSize, f * maxFS + offset, rowY + offset, e.frameSize, e.frameSize);
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
    _swapPalette(src, srcColors, dstColors) {
        const w = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth;
        const h = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight;
        if (w === 0 || h === 0)
            return null;
        const colorMap = this._get32BitColorMap(srcColors, dstColors);
        if (colorMap.size === 0)
            return null;
        const tmp = document.createElement("canvas");
        tmp.width = w;
        tmp.height = h;
        const tmpCtx = tmp.getContext("2d");
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.drawImage(src, 0, 0);
        const imgData = tmpCtx.getImageData(0, 0, w, h);
        const data = new Uint32Array(imgData.data.buffer);
        let changed = false;
        for (let i = 0; i < data.length; i++) {
            const pixel = data[i];
            if ((pixel & 0xFF000000) === 0)
                continue;
            const replaced = colorMap.get(pixel);
            if (replaced !== undefined && replaced !== pixel) {
                data[i] = replaced;
                changed = true;
            }
        }
        if (!changed)
            return null;
        tmpCtx.putImageData(imgData, 0, 0);
        return tmp;
    }
    _hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }
    static sColorMapCache = new Map();
    _get32BitColorMap(srcColors, dstColors) {
        const key = srcColors.join(',') + '|' + dstColors.join(',');
        if (CParserULPC.sColorMapCache.has(key))
            return CParserULPC.sColorMapCache.get(key);
        const map = new Map();
        for (let i = 0; i < srcColors.length && i < dstColors.length; i++) {
            const s = this._hexToRgb(srcColors[i]);
            const d = this._hexToRgb(dstColors[i]);
            if (!s || !d)
                continue;
            const dst32 = ((255 << 24) | (d.b << 16) | (d.g << 8) | d.r) >>> 0;
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
        const matKey = JSON.stringify(matGroups);
        const cacheKey = `${img.src}|${matKey}`;
        if (this.mTempNRecolorCache.has(cacheKey))
            return this.mTempNRecolorCache.get(cacheKey);
        let current = img;
        for (const g of matGroups) {
            if (!g.baseHex || !g.recolorHex)
                continue;
            const res = this._swapPalette(current, g.baseHex, g.recolorHex);
            if (res)
                current = res;
        }
        this.mTempNRecolorCache.set(cacheKey, current);
        return current;
    }
}
