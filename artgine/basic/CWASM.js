import { CArray } from "./CArray.js";
import { CPath } from "./CPath.js";
import { CUtil } from "./CUtil.js";
import { CClass } from "./CClass.js";
import { CAlert } from "./CAlert.js";
var g_F32A2 = new CArray();
var g_F32A3 = new CArray();
var g_F32A4 = new CArray();
var g_F32A16 = new CArray();
var g_F32A24 = new CArray();
var gThread = true;
let gAsyncReqId = 0;
var gMemory = null;
var gInstance = null;
var gIsSimd = false;
var gArrayBufferId = 0;
var gLastBuffer = null;
var gLastBufferLen = 0;
let gOctResultBuf = null;
let gGjkBuf = null;
let gGjkResultBuf = null;
const gF32Owners = [];
const gOctInsOwners = [];
function markView(_arr, _ptr, _len) {
    _arr["ptr"] = _ptr;
    _arr["len"] = _len;
    return _arr;
}
function rebaseF32(_arr) {
    if (_arr == null || _arr["ptr"] == null)
        return _arr;
    if (gMemory != null && _arr.buffer === gMemory.buffer)
        return _arr;
    const ptr = _arr["ptr"];
    const len = _arr["len"];
    if (len == null || len <= 0)
        return _arr;
    return markView(new Float32Array(gMemory.buffer, ptr, len), ptr, len);
}
function rebaseI32(_arr) {
    if (_arr == null || _arr["ptr"] == null)
        return _arr;
    if (gMemory != null && _arr.buffer === gMemory.buffer)
        return _arr;
    const ptr = _arr["ptr"];
    const len = _arr["len"];
    if (len == null || len <= 0)
        return _arr;
    return markView(new Int32Array(gMemory.buffer, ptr, len), ptr, len);
}
function rebasePool(_pool) {
    for (let i = 0; i < _pool.Size(); ++i) {
        const a = _pool.Find(i);
        if (a != null)
            _pool.Modify(i, rebaseF32(a));
    }
}
function rebaseAllViews() {
    rebasePool(g_F32A2);
    rebasePool(g_F32A3);
    rebasePool(g_F32A4);
    rebasePool(g_F32A16);
    rebasePool(g_F32A24);
    if (gOctResultBuf != null)
        gOctResultBuf = rebaseI32(gOctResultBuf);
    if (gGjkBuf != null)
        gGjkBuf = rebaseF32(gGjkBuf);
    if (gGjkResultBuf != null)
        gGjkResultBuf = rebaseF32(gGjkResultBuf);
    for (let i = 0; i < gOctInsOwners.length; ++i) {
        const mgr = gOctInsOwners[i];
        if (mgr != null && mgr._insBuf != null)
            mgr._insBuf = rebaseF32(mgr._insBuf);
    }
    for (let i = 0; i < gF32Owners.length; ++i) {
        const o = gF32Owners[i];
        if (o != null && o.mF32A != null)
            o.mF32A = rebaseF32(o.mF32A);
    }
}
function checkMemoryGrow() {
    if (gMemory == null)
        return;
    const buf = gMemory.buffer;
    if (buf === gLastBuffer)
        return;
    const oldLen = gLastBufferLen;
    gLastBuffer = buf;
    gLastBufferLen = buf.byteLength;
    rebaseAllViews();
}
function afterWasm(_value) {
    checkMemoryGrow();
    return _value;
}
function wasmNew(_byteLength) {
    const newFn = gInstance.exports.__new;
    const pinFn = gInstance.exports.__pin;
    const ptr = newFn(_byteLength, gArrayBufferId);
    pinFn(ptr);
    checkMemoryGrow();
    return ptr;
}
const textDecoder = new TextDecoder("utf-16le");
let keyNameCache = [];
let gRotBase = 0;
const WIRE_STEP = 197;
const gSessionSeed = (() => {
    try {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] & 0xFFFF;
    }
    catch {
        return Math.floor(Math.random() * 0x10000);
    }
})();
function readAsString(ptr) {
    if (ptr < 4 || ptr - 4 + 4 > gMemory.buffer.byteLength) {
        return `<invalid ptr:${ptr} bufLen:${gMemory.buffer.byteLength}>`;
    }
    const view = new DataView(gMemory.buffer);
    const byteLength = view.getUint32(ptr - 4, true);
    if (byteLength > gMemory.buffer.byteLength) {
        return `<invalid ptr:${ptr} byteLength:${byteLength} bufLen:${gMemory.buffer.byteLength}>`;
    }
    return textDecoder.decode(new Uint8Array(gMemory.buffer, ptr, byteLength));
}
function getKeyName(wiredIdx) {
    checkMemoryGrow();
    const n = keyNameCache.length;
    let trueIdx = (wiredIdx - gRotBase) % n;
    if (trueIdx < 0)
        trueIdx += n;
    const name = keyNameCache[trueIdx];
    if (name === undefined) {
        throw new Error(`CWASM: keyNameCache miss at offset ${trueIdx} (wired=${wiredIdx}, base=${gRotBase}) ??jsMergeKeys媛 ?꾩쭅 ???ㅻ? ??蹂대궦 ?곹깭?먯꽌 ?묎렐???쇱뼱?щ떎.`);
    }
    return name;
}
function jsLinkDispatch(linkId, ...args) {
    switch (getKeyName(linkId)) {
        case "iustfhfs":
        case "b4twdh":
        case "j76892":
        case "di3d3ti3": {
            const [obj, keyIndex] = args;
            return obj[getKeyName(keyIndex)];
        }
        case "r9odfl3":
        case "h5ydpda8":
        case "m33s7yf0": {
            const [obj, keyIndex, value] = args;
            obj[getKeyName(keyIndex)] = value;
            return null;
        }
        case "uxr3mh4":
        case "tnnyez1":
        case "n4gf2d0e":
        case "emh83b25": {
            const [obj, methodIndex] = args;
            return obj[getKeyName(methodIndex)]();
        }
        case "kzkcai":
        case "rnj5aohn":
        case "ddo2hvt":
        case "nhjwptb8": {
            const [obj, methodIndex, a0] = args;
            return obj[getKeyName(methodIndex)](a0);
        }
        case "l81koa":
        case "l1zbv6":
        case "c9fhpqt":
        case "xoq70k": {
            const [obj, methodIndex, a0] = args;
            return obj[getKeyName(methodIndex)](readAsString(a0));
        }
        case "tmwd0m":
        case "f447z2n":
        case "ccl9gcb":
        case "dbd9f0": {
            const [obj, methodIndex, a0] = args;
            return obj[getKeyName(methodIndex)](a0);
        }
        case "pb57ia": {
            const [obj, methodIndex, a0] = args;
            const reqId = ++gAsyncReqId;
            const arg = readAsString(a0);
            Promise.resolve(obj[getKeyName(methodIndex)](arg))
                .then((data) => {
                const u8 = data == null ? new Uint8Array(0) : (data instanceof Uint8Array ? data : new Uint8Array(data));
                let ptr = 0;
                if (u8.byteLength > 0) {
                    ptr = wasmNew(u8.byteLength);
                    new Uint8Array(gMemory.buffer, ptr, u8.byteLength).set(u8);
                }
                checkMemoryGrow();
                gInstance.exports.OnAsyncD(reqId, ptr, u8.byteLength);
            })
                .catch(() => {
                gInstance.exports.OnAsyncD(reqId, 0, -1);
            });
            return reqId;
        }
        case "gnhwjn":
        case "pr5d36pi":
        case "xri5xqm": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, a1);
        }
        case "wbday1":
        case "vrjo2nan": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, readAsString(a1));
        }
        case "n5zgjsu":
        case "aqa8yf": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, a1);
        }
        case "gylu44":
        case "o5debga": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](readAsString(a0), a1);
        }
        case "rx83te":
        case "sum849": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](readAsString(a0), readAsString(a1));
        }
        case "crvach":
        case "qailr7": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](readAsString(a0), a1);
        }
        case "zg5i6x1p":
        case "nfx989":
        case "b4ixuiy": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, a1);
        }
        case "sxj6cq":
        case "p0az8t10": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, readAsString(a1));
        }
        case "ffsseqr4":
        case "ok5mngk":
        case "jjj2nv": {
            const [obj, methodIndex, a0, a1] = args;
            return obj[getKeyName(methodIndex)](a0, a1);
        }
        case "xvdyr776": {
            const [obj, methodIndex, a0, a1, a2] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2);
            return null;
        }
        case "jhoqtdkn": {
            const [obj, methodIndex, a0, a1, a2, a3, a4] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4);
            return null;
        }
        case "o7itpj": {
            const [obj, methodIndex, a0, a1, a2, a3] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3);
            return null;
        }
        case "zyc64d9r": {
            const [obj, methodIndex, a0, a1, a2, a3] = args;
            return obj[getKeyName(methodIndex)](a0, a1, a2, a3);
        }
        case "n8df2qt": {
            const [obj, methodIndex, a0, a1, a2, a3] = args;
            obj[getKeyName(methodIndex)](a0, readAsString(a1), a2, a3);
            return null;
        }
        case "ziuqpz2q": {
            const [v] = args;
            return (typeof HTMLCanvasElement !== "undefined" && v instanceof HTMLCanvasElement) ? 1 : 0;
        }
        case "zn6qg6y": {
            const [obj, methodIndex, a0, a1, a2] = args;
            return obj[getKeyName(methodIndex)](a0, a1, a2);
        }
        case "o7s564": {
            const [obj, methodIndex, a0, a1, a2, a3] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3);
            return null;
        }
        case "ywftq76": {
            const [obj, methodIndex, a0, a1, a2, a3, a4] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4);
            return null;
        }
        case "vf9d9x4": {
            const [obj, methodIndex, a0, a1, a2, a3, a4, a5] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5);
            return null;
        }
        case "j9ima6": {
            const [obj, methodIndex, a0, a1, a2] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2);
            return null;
        }
        case "l9bs2j0": {
            const [obj, methodIndex, a0, a1, a2, a3] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3);
            return null;
        }
        case "j8a6y89": {
            const [obj, methodIndex, a0, a1, a2] = args;
            return obj[getKeyName(methodIndex)](a0, a1, a2);
        }
        case "i88lhb": {
            const [v] = args;
            return (typeof Image !== "undefined" && v instanceof Image) ? 1 : 0;
        }
        case "o8ccyls": {
            const [v] = args;
            return (typeof HTMLVideoElement !== "undefined" && v instanceof HTMLVideoElement) ? 1 : 0;
        }
        case "h793pp36": {
            const [obj, methodIndex, a0, a1, a2] = args;
            return obj[getKeyName(methodIndex)](a0, a1, a2);
        }
        case "m1epgm":
        case "lu64pw": {
            const [obj, methodIndex, a0, a1, a2] = args;
            return obj[getKeyName(methodIndex)](a0, a1, a2);
        }
        case "x5ibtshk": {
            const [obj, methodIndex, a0, a1, a2, a3, a4, a5] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5);
            return null;
        }
        case "xj6875s": {
            const [obj, methodIndex, a0, a1, a2, a3, a4, a5, a6, a7, a8] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8);
            return null;
        }
        case "wwu4fn": {
            const [obj, methodIndex, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9] = args;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            return null;
        }
        case "fkx978i": {
            const [obj, keyIndex, value] = args;
            obj[getKeyName(keyIndex)] = value;
            return null;
        }
        case "yj9dtyk":
        case "gb9xtjs":
        case "ooawz1l":
        case "i7x2wc": {
            const [v] = args;
            if (typeof v === "number")
                return v;
            if (typeof v === "boolean")
                return v ? 1 : 0;
            return 0;
        }
        case "sh9tlnu1":
        case "ksmbdn":
        case "xkhx81o": {
            const [arr, i] = args;
            return arr[i];
        }
        case "mrl724e": {
            const [arr, i, value] = args;
            arr[i] = value;
            return null;
        }
        case "x4l9a3u": {
            const [v] = args;
            return (v === null || v === undefined) ? 1 : 0;
        }
        case "mjoap8": {
            const [a, b] = args;
            return (a === b) ? 1 : 0;
        }
        case "gguzuadw": {
            const [obj, ctor] = args;
            return (obj instanceof ctor) ? 1 : 0;
        }
        case "r6o7fs8u": {
            const [v] = args;
            return (v === undefined) ? 1 : 0;
        }
        case "qk2jyipv": {
            const [classIndex, arg0Ptr] = args;
            return CClass.New(getKeyName(classIndex), [readAsString(arg0Ptr)]);
        }
        case "tk51mai": {
            const [classIndex] = args;
            return CClass.New(getKeyName(classIndex), []);
        }
        case "ex7titq": {
            const [classIndex, arg0] = args;
            return CClass.New(getKeyName(classIndex), [arg0]);
        }
        case "bb76yn": {
            const [classIndex, a0, a1, a2] = args;
            return CClass.New(getKeyName(classIndex), [a0, a1, a2]);
        }
        case "uklwhdt5": {
            const [classIndex, a0, a1, a2] = args;
            return CClass.New(getKeyName(classIndex), [a0, a1, a2]);
        }
        case "dnn641z": {
            const [classIndex, a0] = args;
            return CClass.New(getKeyName(classIndex), [a0]);
        }
        case "tf5sgl": {
            const [classIndex, a0, a1, a2, a3] = args;
            return CClass.New(getKeyName(classIndex), [a0, a1, a2, a3]);
        }
        case "iwvn2wod": {
            const [classIndex, a0, a1] = args;
            return CClass.New(getKeyName(classIndex), [a0, a1]);
        }
        case "npl8nsmw": {
            const [classIndex, a0, a1] = args;
            return CClass.New(getKeyName(classIndex), [a0, a1]);
        }
        case "d3kswr": {
            const [classIndex] = args;
            return CClass.Find(getKeyName(classIndex));
        }
        case "u284ga": return [];
        case "z0x9zvvd":
        case "hq3mdxa1":
        case "vt78zwrq":
        case "cn2ubhz9": {
            const [obj, keyIndex] = args;
            const raw = obj[getKeyName(keyIndex)];
            const str = (typeof raw === "string") ? raw : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let i = 0; i < str.length; i++)
                buf[i] = str.charCodeAt(i);
            return ptr;
        }
        case "u8wdweu":
        case "pf49tsan":
        case "ykq9d3vh":
        case "wzq2fbmc": {
            const [obj, keyIndex] = args;
            const key = getKeyName(keyIndex);
            let src = obj[key];
            const count = src["len"] ?? src.length;
            const byteLength = count * 4;
            const ptr = wasmNew(byteLength);
            src = obj[key];
            const n = src["len"] ?? src.length;
            new Float32Array(gMemory.buffer, ptr, n).set(src);
            return ptr;
        }
        case "opkhzzt": {
            const [obj] = args;
            return Object.keys(obj);
        }
        case "hdz97t01": {
            const [arr, i] = args;
            const str = (typeof arr[i] === "string") ? arr[i] : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case "wfijd1v5":
        case "gbnumu":
        case "gfvf8swu":
        case "uut6tx15": {
            const [v] = args;
            const str = (typeof v === "string") ? v : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case "ibg35b4n": {
            const [v] = args;
            const str = String(v);
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case "do4l74": {
            const [ptr] = args;
            try {
                return JSON.parse(readAsString(ptr));
            }
            catch (e) {
                return null;
            }
        }
        case "wi79muy": {
            const [ptr] = args;
            return Number(readAsString(ptr));
        }
        case "notylf": return null;
        case "pr6ciry": {
            const [classIndex, argsArr] = args;
            return CClass.New(getKeyName(classIndex), argsArr);
        }
        case "mnjikh": {
            const [v] = args;
            let str;
            try {
                str = JSON.stringify(v) ?? "";
            }
            catch (e) {
                str = "";
            }
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case "l0zd71": {
            const [n] = args;
            return n;
        }
        case "fm1l98": {
            const [ptr] = args;
            return readAsString(ptr);
        }
        case "dzb6qs": {
            const [b] = args;
            return b !== 0;
        }
        case "jziw6yot": {
            const [obj] = args;
            if (obj === null || obj === undefined)
                return 0;
            if (typeof obj.IsShould === "function" && typeof obj.EditChange === "function")
                return 1;
            if (obj instanceof Array)
                return 2;
            if (obj instanceof Float32Array)
                return 3;
            if (obj instanceof Uint8Array)
                return 4;
            if (obj instanceof Uint16Array)
                return 5;
            if (obj instanceof Int32Array)
                return 6;
            if (obj instanceof Uint32Array)
                return 7;
            if (obj instanceof Set)
                return 8;
            if (obj instanceof Map)
                return 9;
            if (obj instanceof ArrayBuffer)
                return 10;
            const t = typeof obj;
            if (t === "string")
                return 11;
            if (t === "number")
                return 12;
            if (t === "boolean")
                return 13;
            return 14;
        }
        case "u84qru": return {};
        case "xwpraz0": {
            const [obj, keyIndex, valuePtr] = args;
            obj[getKeyName(keyIndex)] = readAsString(valuePtr);
            return null;
        }
        case "qkwqa1": {
            const [v] = args;
            return Array.from(v);
        }
        case "evp3bbn": {
            const [obj] = args;
            return new obj.constructor();
        }
        case "tg45fy82": {
            const [obj, arg0] = args;
            return new obj.constructor(arg0);
        }
        case "p99jx9s": {
            const [arg0] = args;
            return new Uint8Array(arg0);
        }
        case "ob5a0ms7": {
            const [kind, msgPtr] = args;
            const msg = readAsString(msgPtr);
            switch (kind) {
                case 0:
                    CAlert.E(msg);
                    break;
                case 1:
                    CAlert.W(msg);
                    break;
                case 2:
                    CAlert.Info(msg);
                    break;
                case 3:
                    CAlert.Warning(msg);
                    break;
                case 4:
                    CAlert.Error(msg);
                    break;
                case 5:
                    alert(msg);
                    break;
            }
            return null;
        }
    }
    throw new Error(`CWASM: jsLinkDispatch ?????녿뒗 linkId ?대쫫 "${getKeyName(linkId)}"`);
}
function buildImportObject() {
    return {
        index: {
            jsMergeKeys: (deltaPtr) => {
                const wire = readAsString(deltaPtr);
                let delta = "";
                for (let i = 0; i < wire.length / 2; i++) {
                    const key = (gSessionSeed + i * WIRE_STEP) & 0xFFFF;
                    const lo = wire.charCodeAt(i * 2);
                    const hi = wire.charCodeAt(i * 2 + 1);
                    const v = (hi << 8) | lo;
                    delta += String.fromCharCode(v ^ key);
                }
                const entries = delta.split(String.fromCharCode(3));
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    if (entry === "")
                        continue;
                    const sep = entry.indexOf(String.fromCharCode(2));
                    const offset = parseInt(entry.substring(0, sep), 10);
                    const name = entry.substring(sep + 1);
                    keyNameCache[offset] = name;
                }
            },
            jsSetArrPos: (pos) => {
                gRotBase = pos;
            },
            jsGetSeed: () => gSessionSeed,
            jsLinkONOFFF_O: jsLinkDispatch, jsLinkNFFFF_O: jsLinkDispatch, jsLinkNFOF_O: jsLinkDispatch,
            jsLinkONFS_O: jsLinkDispatch, jsLinkONOSFF_O: jsLinkDispatch, jsLinkONOOOFF_O: jsLinkDispatch,
            jsLinkONFFO_O: jsLinkDispatch, jsLinkONSF_O: jsLinkDispatch, jsLinkNS_O: jsLinkDispatch,
            jsLinkONSO_O: jsLinkDispatch, jsLinkNOO_O: jsLinkDispatch, jsLinkS_O: jsLinkDispatch,
            jsLinkONFFFFFO_O: jsLinkDispatch, jsLinkF_O: jsLinkDispatch, jsLinkONSS_O: jsLinkDispatch,
            jsLinkONFOF_O: jsLinkDispatch, jsLinkOO_O: jsLinkDispatch, jsLinkONFFFFFFFFFO_O: jsLinkDispatch,
            jsLinkONFFFFFFFFO_O: jsLinkDispatch, jsLinkONOOOOO_O: jsLinkDispatch, jsLinkONOOFO_O: jsLinkDispatch,
            jsLinkONS_N: jsLinkDispatch, jsLinkOO_N: jsLinkDispatch, jsLinkS_F: jsLinkDispatch,
            jsLinkO_F: jsLinkDispatch, jsLinkON_D: jsLinkDispatch,
        },
        Qz7: {
            w4k() {
                const raw = new Error().stack || "";
                const b = new TextEncoder().encode(raw);
                const offset = gInstance.exports.o2f();
                const base = Number(gInstance.exports.scratchPtr());
                const mem = new Uint8Array(gMemory.buffer);
                mem.set(b, base + offset);
                return b.length;
            },
            u3n() {
                if (!CUtil.IsNode())
                    return 1;
                const isElectron = typeof process !== "undefined" && !!process.versions
                    && process.versions.electron != null;
                return isElectron ? 1 : 0;
            },
            e8v() {
                const argv = (typeof process !== "undefined" && process.execArgv) ? process.execArgv.join(" ") : "";
                const b = new TextEncoder().encode(argv);
                const offset = gInstance.exports.o2f();
                const base = Number(gInstance.exports.scratchPtr());
                const mem = new Uint8Array(gMemory.buffer);
                mem.set(b, base + offset);
                return b.length;
            },
            k9v() {
                return Date.now() & 0xff;
            },
            t2r() {
                return gMemory.buffer.byteLength & 0xff;
            },
            x7q() {
                const n = Number(gInstance.exports.o2f());
                return (n * 2654435761) >>> 24;
            },
            fbe() {
                return gMemory.buffer.byteLength ^ 677640;
            },
            kmn() {
                const o = Number(gInstance.exports.o2f());
                return (o * 225308) >>> 24;
            },
            b7k() {
                return (Date.now() ^ 81733) & 0xff;
            },
            w4x() {
                return Math.floor(Math.sin(184851) * 1000) & 0xff;
            },
            rhs() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 573720) & 0xff;
            },
            a4v() {
                return (112378 * 2654435761) >>> 24;
            },
            v3y() {
                return gMemory.buffer.byteLength ^ 180843;
            },
            wkr() {
                const o = Number(gInstance.exports.o2f());
                return (o * 382851) >>> 24;
            },
            plk() {
                return (Date.now() ^ 180685) & 0xff;
            },
            ksb() {
                return Math.floor(Math.sin(212366) * 1000) & 0xff;
            },
            p5s() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 472489) & 0xff;
            },
            o8j() {
                return (761763 * 2654435761) >>> 24;
            },
            jte() {
                return gMemory.buffer.byteLength ^ 172843;
            },
            a4n() {
                const o = Number(gInstance.exports.o2f());
                return (o * 559962) >>> 24;
            },
            b9a() {
                return (Date.now() ^ 672633) & 0xff;
            },
            i2p() {
                return Math.floor(Math.sin(779807) * 1000) & 0xff;
            },
            j1o() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 283947) & 0xff;
            },
            owt() {
                return (855191 * 2654435761) >>> 24;
            },
            t9e() {
                return gMemory.buffer.byteLength ^ 559330;
            },
            wkj() {
                const o = Number(gInstance.exports.o2f());
                return (o * 666065) >>> 24;
            },
            j9k() {
                return (Date.now() ^ 163372) & 0xff;
            },
            e6x() {
                return Math.floor(Math.sin(794188) * 1000) & 0xff;
            },
            n5u() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 236421) & 0xff;
            },
            ywn() {
                return (376922 * 2654435761) >>> 24;
            },
            p9k() {
                return gMemory.buffer.byteLength ^ 753386;
            },
            k0t() {
                const o = Number(gInstance.exports.o2f());
                return (o * 780905) >>> 24;
            },
            xhg() {
                return (Date.now() ^ 380212) & 0xff;
            },
            k4f() {
                return Math.floor(Math.sin(499912) * 1000) & 0xff;
            },
            z5a() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 382255) & 0xff;
            },
            ymp() {
                return (52234 * 2654435761) >>> 24;
            },
            bxo() {
                return gMemory.buffer.byteLength ^ 799306;
            },
            g0d() {
                const o = Number(gInstance.exports.o2f());
                return (o * 667517) >>> 24;
            },
            hhm() {
                return (Date.now() ^ 214123) & 0xff;
            },
            w0f() {
                return Math.floor(Math.sin(670745) * 1000) & 0xff;
            },
            h1s() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 247415) & 0xff;
            },
            s4p() {
                return (689656 * 2654435761) >>> 24;
            },
            vlq() {
                return gMemory.buffer.byteLength ^ 331464;
            },
            w6x() {
                const o = Number(gInstance.exports.o2f());
                return (o * 724389) >>> 24;
            },
            d9q() {
                return (Date.now() ^ 813015) & 0xff;
            },
            a4r() {
                return Math.floor(Math.sin(611389) * 1000) & 0xff;
            },
            z7a() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 847261) & 0xff;
            },
            o4x() {
                return (243596 * 2654435761) >>> 24;
            },
            j3s() {
                return gMemory.buffer.byteLength ^ 606721;
            },
            s2j() {
                const o = Number(gInstance.exports.o2f());
                return (o * 323306) >>> 24;
            },
            b1i() {
                return (Date.now() ^ 441650) & 0xff;
            },
            kwz() {
                return Math.floor(Math.sin(743377) * 1000) & 0xff;
            },
            z7q() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 639294) & 0xff;
            },
            mut() {
                return (249870 * 2654435761) >>> 24;
            },
            x9i() {
                return gMemory.buffer.byteLength ^ 338915;
            },
            ggv() {
                const o = Number(gInstance.exports.o2f());
                return (o * 195098) >>> 24;
            },
            f1y() {
                return (Date.now() ^ 692409) & 0xff;
            },
            q8r() {
                return Math.floor(Math.sin(386966) * 1000) & 0xff;
            },
            l1a() {
                const p = Number(gInstance.exports.scratchPtr());
                return (p ^ 650542) & 0xff;
            },
            eed() {
                return (666742 * 2654435761) >>> 24;
            },
            p3k() {
                let path = "";
                if (CUtil.IsNode() && typeof process !== "undefined") {
                    path = process.cwd();
                }
                else if (typeof location !== "undefined") {
                    path = location.href;
                }
                return (path.length ^ 391021) & 0xff;
            },
            h6d() {
                let s = "";
                if (typeof navigator !== "undefined") {
                    s = navigator.userAgent;
                }
                return (s.length * 2654435761) >>> 24;
            },
            c2p() {
                if (CUtil.IsNode() && typeof process !== "undefined") {
                    return (process.pid ^ 55321) & 0xff;
                }
                return typeof screen !== "undefined" ? (screen.width ^ 55321) & 0xff : 0;
            },
            m8w() {
                let s = "";
                if (CUtil.IsNode() && typeof process !== "undefined") {
                    s = process.platform;
                }
                else if (typeof navigator !== "undefined") {
                    s = navigator.platform;
                }
                return (s.length ^ 610294) & 0xff;
            },
            r5v() {
                return typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ^ 27182) & 0xff : 0;
            },
            y1z() {
                let s = "";
                if (CUtil.IsNode() && typeof process !== "undefined") {
                    s = process.version;
                }
                else if (typeof document !== "undefined") {
                    s = document.title;
                }
                return (s.length * 2654435761) >>> 24;
            },
        },
        env: {
            abort: (msgPtr, fileNamePtr, line, column) => {
                throw new Error(`CWASM abort: ${readAsString(msgPtr)} at ${readAsString(fileNamePtr)}:${line}:${column}`);
            },
            seed: () => Date.now(),
            memory: gMemory,
        },
    };
}
async function instantiate(fileName, bytes) {
    gMemory = new WebAssembly.Memory({ initial: 512, maximum: 16384 });
    gLastBuffer = gMemory.buffer;
    gLastBufferLen = gLastBuffer.byteLength;
    const wasmBytes = bytes ?? await CWASM.LoadArtgineBytes("artgine/wasm/" + fileName);
    const { instance } = await WebAssembly.instantiate(wasmBytes, buildImportObject());
    return instance;
}
async function loadSingleton() {
    let simdBytes = null;
    try {
        const bytes = await CWASM.LoadArtgineBytes("artgine/wasm/ASM_SIMD.wasm");
        if (WebAssembly.validate(bytes))
            simdBytes = bytes;
    }
    catch (e) {
    }
    gIsSimd = simdBytes != null;
    gInstance = gIsSimd
        ? await instantiate("ASM_SIMD.wasm", simdBytes)
        : await instantiate("ASM.wasm");
    gArrayBufferId = gInstance.exports.ARRAYBUFFER_ID.value;
}
function allocRaw(byteLength) {
    return wasmNew(byteLength);
}
const OCT_RESULT_CAP = 16384;
function octResultBuf() {
    checkMemoryGrow();
    if (gOctResultBuf == null) {
        const ptr = allocRaw(OCT_RESULT_CAP * 4);
        gOctResultBuf = markView(new Int32Array(gMemory.buffer, ptr, OCT_RESULT_CAP), ptr, OCT_RESULT_CAP);
    }
    return gOctResultBuf;
}
function octReadResults(_buf) {
    const out = [];
    for (let i = 0; i < _buf.length; ++i) {
        const v = _buf[i];
        if (v === -1)
            break;
        out.push(v);
    }
    return out;
}
const OCT_INSERT_STRIDE = 15;
function octInsertBufEnsure(_mgr, _minRecords) {
    checkMemoryGrow();
    const curCap = _mgr["_insCap"] || 0;
    if (_mgr["_insBuf"] != null && curCap >= _minRecords)
        return;
    const newCap = Math.max(_minRecords, curCap > 0 ? curCap * 2 : 1024);
    const ptr = allocRaw(newCap * OCT_INSERT_STRIDE * 4);
    const newLen = newCap * OCT_INSERT_STRIDE;
    const newBuf = markView(new Float32Array(gMemory.buffer, ptr, newLen), ptr, newLen);
    if (_mgr["_insBuf"] != null)
        newBuf.set(_mgr["_insBuf"].subarray(0, (_mgr["_insCount"] || 0) * OCT_INSERT_STRIDE));
    _mgr["_insBuf"] = newBuf;
    _mgr["_insCap"] = newCap;
    if (gOctInsOwners.indexOf(_mgr) < 0)
        gOctInsOwners.push(_mgr);
}
function gjkBufEnsure(_minFloats) {
    checkMemoryGrow();
    const curLen = gGjkBuf != null ? (gGjkBuf["len"] ?? gGjkBuf.length) : 0;
    if (gGjkBuf != null && curLen >= _minFloats)
        return gGjkBuf;
    const newLen = Math.max(_minFloats, curLen > 0 ? curLen * 2 : 4096);
    const ptr = allocRaw(newLen * 4);
    gGjkBuf = markView(new Float32Array(gMemory.buffer, ptr, newLen), ptr, newLen);
    return gGjkBuf;
}
function gjkPackShape(_buf, _off, _shape) {
    const type = _shape.mBound.GetType();
    _buf[_off + 0] = type;
    const mat = _shape.mMat.mF32A, imat = _shape.mIMat.mF32A;
    for (let i = 0; i < 16; ++i)
        _buf[_off + 1 + i] = mat[i];
    for (let i = 0; i < 16; ++i)
        _buf[_off + 17 + i] = imat[i];
    _buf[_off + 33] = _shape.mWBound.mMin.mF32A[0];
    _buf[_off + 34] = _shape.mWBound.mMin.mF32A[1];
    _buf[_off + 35] = _shape.mWBound.mMin.mF32A[2];
    _buf[_off + 36] = _shape.mWBound.mMax.mF32A[0];
    _buf[_off + 37] = _shape.mWBound.mMax.mF32A[1];
    _buf[_off + 38] = _shape.mWBound.mMax.mF32A[2];
    _buf[_off + 39] = _shape.mRadian;
    let vertCount = 0;
    if (type == 2) {
        vertCount = _shape.mBound.mPos.Size();
        _buf[_off + 40] = vertCount;
        for (let i = 0; i < vertCount; ++i) {
            const v = _shape.mBound.mPos.Find(i).mF32A;
            _buf[_off + 41 + i * 3] = v[0];
            _buf[_off + 41 + i * 3 + 1] = v[1];
            _buf[_off + 41 + i * 3 + 2] = v[2];
        }
    }
    else
        _buf[_off + 40] = 0;
    return _off + 41 + vertCount * 3;
}
function gjkPackPair(_shapeA, _shapeB) {
    const vcA = _shapeA.mBound.GetType() == 2 ? _shapeA.mBound.mPos.Size() : 0;
    const vcB = _shapeB.mBound.GetType() == 2 ? _shapeB.mBound.mPos.Size() : 0;
    const need = (41 + vcA * 3) + (41 + vcB * 3);
    const buf = gjkBufEnsure(need);
    const offA = 0;
    const offB = gjkPackShape(buf, offA, _shapeA);
    gjkPackShape(buf, offB, _shapeB);
    const base = buf["ptr"];
    return { ptrA: base + offA * 4, ptrB: base + offB * 4 };
}
function gjkResultBuf() {
    checkMemoryGrow();
    if (gGjkResultBuf == null) {
        const ptr = allocRaw(3 * 4);
        gGjkResultBuf = markView(new Float32Array(gMemory.buffer, ptr, 3), ptr, 3);
    }
    return gGjkResultBuf;
}
function liftDecodeString(pointer) {
    if (!pointer)
        return "";
    const memoryU32 = new Uint32Array(gMemory.buffer);
    const memoryU16 = new Uint16Array(gMemory.buffer);
    const start = pointer >>> 1;
    const end = start + (memoryU32[(pointer - 4) >>> 2] >>> 1);
    return String.fromCharCode(...memoryU16.subarray(start, end));
}
export class CWASM {
    static async LoadArtgineBytes(_relPath) {
        const path = CUtil.IsNode()
            ? CPath.ArtgineRootPath() + _relPath
            : CPath.WebRootArtgineUrl() + _relPath;
        if (CUtil.IsNode()) {
            const fs = await import("fs/promises");
            return await fs.readFile(path);
        }
        const res = await fetch(path);
        return await res.arrayBuffer();
    }
    static JSMode() {
        return false;
    }
    static SetThread(_enable) {
        gThread = _enable;
    }
    static GetThread() { return gThread; }
    static IsSIMD() {
        return gIsSimd;
    }
    static Malloc(_size) {
        return allocRaw(_size);
    }
    static Free(_ptr) {
        if (gInstance == null || _ptr == null)
            return;
        gInstance.exports.__unpin(_ptr);
    }
    static NewI32A(_size) {
        if (CWASM.IsSIMD() == false) {
            return new Int32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = allocRaw(numBytes);
        return markView(new Int32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }
    static NewU32A(_size) {
        if (CWASM.IsSIMD() == false) {
            return new Uint32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = allocRaw(numBytes);
        return markView(new Uint32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }
    static NewF32A(_size) {
        if (CWASM.IsSIMD() == false) {
            return new Float32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = allocRaw(numBytes);
        return markView(new Float32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }
    static RegisterF32A(_owner) {
        if (_owner == null)
            return;
        if (gF32Owners.indexOf(_owner) < 0)
            gF32Owners.push(_owner);
    }
    static UnregisterF32A(_owner) {
        if (_owner == null)
            return;
        const i = gF32Owners.indexOf(_owner);
        if (i < 0)
            return;
        gF32Owners[i] = gF32Owners[gF32Owners.length - 1];
        gF32Owners.pop();
    }
    static ProductF32A(_count) {
        checkMemoryGrow();
        let F32A = g_F32A2.Pop();
        if (F32A == null)
            F32A = CWASM.NewF32A(_count);
        else
            F32A = rebaseF32(F32A);
        for (let i = 0; i < _count; ++i)
            F32A[i] = 0;
        return F32A;
    }
    static Recycle(_F32A) {
        if (_F32A == null || _F32A["ptr"] == null)
            return;
        checkMemoryGrow();
        _F32A = rebaseF32(_F32A);
        const bytes = (_F32A["len"] != null ? _F32A["len"] * 4 : _F32A.byteLength);
        switch (bytes) {
            case 8:
                g_F32A2.Push(_F32A);
                break;
            case 12:
                g_F32A3.Push(_F32A);
                break;
            case 16:
                g_F32A4.Push(_F32A);
                break;
            case 64:
                g_F32A16.Push(_F32A);
                break;
            case 96:
                g_F32A24.Push(_F32A);
                break;
            default:
                break;
        }
    }
    static PlaneSphereInside(_planePtr, _posPtr, _radius) {
        return gInstance.exports.PlaneSphereInside(_planePtr, _posPtr, _radius);
    }
    static V3Distance(_a, _b) {
        return gInstance.exports.V3Distance(_a, _b);
    }
    static BoundMulMat(_tminPtr, _tmaxPtr, _ominPtr, _omaxPtr, _matPtr, _center) {
        return gInstance.exports.BoundMulMat(_tminPtr, _tmaxPtr, _ominPtr, _omaxPtr, _matPtr, _center);
    }
    static MatMemcpy(_a, _b) {
        gInstance.exports.MatMemcpy(_a, _b);
    }
    static MatMul(_a, _b, _dst) {
        gInstance.exports.MatMul(_a, _b, _dst);
    }
    static MatInvert(_src, _dst) {
        gInstance.exports.MatInvert(_src, _dst);
    }
    static FN_CSubject_RouteMsg = 0;
    static FN_CSubject_RootMsgUpdate = 1;
    static FN_CSubject_RouteMsgUpdate = 2;
    static FN_CSubject_MatUpdate = 3;
    static CSubject_RouteMsg(_subject, _msg) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CSubject_RouteMsg, _subject, _msg);
        checkMemoryGrow();
    }
    static CSubject_RootMsgUpdate(_subject, _update) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CSubject_RootMsgUpdate, _subject, _update);
        checkMemoryGrow();
    }
    static CSubject_RouteMsgUpdate(_subject, _update) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CSubject_RouteMsgUpdate, _subject, _update);
        checkMemoryGrow();
    }
    static CSubject_MatUpdate(_subject, _rsUpdate) {
        gInstance.exports.ASM_LINK_ON(CWASM.FN_CSubject_MatUpdate, _subject, _rsUpdate ? 1 : 0);
        checkMemoryGrow();
    }
    static FN_CVoxelMap_PlaneRefresh = 12;
    static FN_CVoxelMap_RefreshRes = 13;
    static FN_CVoxelMap_PickBox = 14;
    static CVoxelMap_PlaneRefresh(_voxel, _index) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CVoxelMap_PlaneRefresh, _voxel, _index);
        checkMemoryGrow();
    }
    static CVoxelMap_RefreshRes(_voxel) {
        gInstance.exports.ASM_LINK_O(CWASM.FN_CVoxelMap_RefreshRes, _voxel);
        checkMemoryGrow();
    }
    static CVoxelMap_PickBox(_voxel, _ray) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CVoxelMap_PickBox, _voxel, _ray));
    }
    static FN_CObject_EditChange = 21;
    static FN_CObject_ImportCJSON = 22;
    static FN_CObject_ExportJSON = 23;
    static CObject_EditChange(_obj, _pointer, _child) {
        gInstance.exports.ASM_LINK_OON(CWASM.FN_CObject_EditChange, _obj, _pointer, _child ? 1 : 0);
        checkMemoryGrow();
    }
    static CObject_ImportCJSON(_obj, _json) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CObject_ImportCJSON, _obj, _json));
    }
    static CObject_ExportJSON(_obj) {
        return afterWasm(gInstance.exports.ASM_LINK_O_RO(CWASM.FN_CObject_ExportJSON, _obj));
    }
    static FN_CObject_Export = 44;
    static FN_CObject_Import = 45;
    static CObject_Export(_obj, _copy, _resetKey) {
        return afterWasm(gInstance.exports.ASM_LINK_ONN_RO(CWASM.FN_CObject_Export, _obj, _copy ? 1 : 0, _resetKey ? 1 : 0));
    }
    static CObject_Import(_tar, _org) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CObject_Import, _tar, _org);
        checkMemoryGrow();
    }
    static FN_Octree_New = 50;
    static FN_Octree_Delete = 51;
    static FN_Octree_Build = 52;
    static FN_Octree_InsertBatch = 54;
    static FN_Octree_InsideRay = 55;
    static FN_Octree_InsideBox = 56;
    static FN_Octree_InsidePlane = 57;
    static COctreeMgr_New() {
        return afterWasm(gInstance.exports.ASM_LINK_OCT_NEW_RO(CWASM.FN_Octree_New));
    }
    static COctreeMgr_Insert(_mgr, _dataId, _cx, _cy, _cz, _sx, _sy, _sz, _hasMinMax, _minx, _miny, _minz, _maxx, _maxy, _maxz, _isStatic) {
        const count = _mgr["_insCount"] || 0;
        octInsertBufEnsure(_mgr, count + 1);
        const buf = _mgr["_insBuf"];
        const o = count * OCT_INSERT_STRIDE;
        buf[o + 0] = _dataId;
        buf[o + 1] = _cx;
        buf[o + 2] = _cy;
        buf[o + 3] = _cz;
        buf[o + 4] = _sx;
        buf[o + 5] = _sy;
        buf[o + 6] = _sz;
        buf[o + 7] = _hasMinMax ? 1 : 0;
        buf[o + 8] = _minx;
        buf[o + 9] = _miny;
        buf[o + 10] = _minz;
        buf[o + 11] = _maxx;
        buf[o + 12] = _maxy;
        buf[o + 13] = _maxz;
        buf[o + 14] = _isStatic ? 1 : 0;
        _mgr["_insCount"] = count + 1;
    }
    static COctreeMgr_Build(_handle, _mgr, _forceStaticUpdate) {
        const octN = gInstance.exports.ASM_LINK_OCT_N;
        const count = _mgr["_insCount"] || 0;
        if (count > 0) {
            octN(CWASM.FN_Octree_InsertBatch, _handle, _mgr["_insBuf"]["ptr"], count, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            _mgr["_insCount"] = 0;
        }
        octN(CWASM.FN_Octree_Build, _handle, _forceStaticUpdate ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        checkMemoryGrow();
    }
    static COctreeMgr_InsideRay(_handle, _ox, _oy, _oz, _dx, _dy, _dz, _rayLength, _boundary) {
        const buf = octResultBuf();
        gInstance.exports.ASM_LINK_OCT_N(CWASM.FN_Octree_InsideRay, _handle, _ox, _oy, _oz, _dx, _dy, _dz, _rayLength, _boundary, buf["ptr"], OCT_RESULT_CAP, 0, 0, 0, 0, 0);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }
    static COctreeMgr_InsideBox(_handle, _minx, _miny, _minz, _maxx, _maxy, _maxz, _excludeId) {
        const buf = octResultBuf();
        gInstance.exports.ASM_LINK_OCT_N(CWASM.FN_Octree_InsideBox, _handle, _minx, _miny, _minz, _maxx, _maxy, _maxz, _excludeId, buf["ptr"], OCT_RESULT_CAP, 0, 0, 0, 0, 0, 0);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }
    static COctreeMgr_InsidePlane(_handle, _bplane) {
        const buf = octResultBuf();
        gInstance.exports.ASM_LINK_OCT_PLANE(CWASM.FN_Octree_InsidePlane, _handle, _bplane, buf["ptr"], OCT_RESULT_CAP);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }
    static FN_GJK_New = 74;
    static FN_GJK_Delete = 75;
    static FN_GJK_Intersect = 76;
    static FN_GJK_EPA = 77;
    static GJK_New() {
        return afterWasm(gInstance.exports.ASM_LINK_OCT_NEW_RO(CWASM.FN_GJK_New));
    }
    static GJK_Delete(_handle) {
        gInstance.exports.ASM_LINK_GJK_N4_RO(CWASM.FN_GJK_Delete, _handle, 0, 0, 0);
        checkMemoryGrow();
    }
    static GJK_Intersect(_handle, _shapeA, _shapeB) {
        const { ptrA, ptrB } = gjkPackPair(_shapeA, _shapeB);
        const r = gInstance.exports.ASM_LINK_GJK_N4_RO(CWASM.FN_GJK_Intersect, _handle, ptrA, ptrB, 0);
        checkMemoryGrow();
        return r != 0;
    }
    static GJK_EPA(_handle, _shapeA, _shapeB) {
        const { ptrA, ptrB } = gjkPackPair(_shapeA, _shapeB);
        const buf = gjkResultBuf();
        gInstance.exports.ASM_LINK_GJK_N4_RO(CWASM.FN_GJK_EPA, _handle, ptrA, ptrB, buf["ptr"]);
        checkMemoryGrow();
        return [gGjkResultBuf[0], gGjkResultBuf[1], gGjkResultBuf[2]];
    }
    static FN_CShaderInterpret_VFPasing = 78;
    static CShaderInterpret_VFPasing(_str, _vfCountArr, _vf) {
        const byteLength = _str.length * 2;
        const ptr = wasmNew(byteLength);
        const buf = new Uint16Array(gMemory.buffer, ptr, _str.length);
        for (let i = 0; i < _str.length; i++)
            buf[i] = _str.charCodeAt(i);
        return afterWasm(gInstance.exports.ASM_LINK_S_OO_RO(CWASM.FN_CShaderInterpret_VFPasing, ptr, _vfCountArr, _vf));
    }
    static FN_CShaderInterpret_Emit = 81;
    static CShaderInterpret_Emit(_self, _ir) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CShaderInterpret_Emit, _self, _ir);
        checkMemoryGrow();
    }
    static FN_CShaderInterpret_EmitStmts = 84;
    static CShaderInterpret_EmitStmts(_self, _arr) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_EmitStmts, _self, _arr));
    }
    static FN_CShaderInterpret_EmitExpr = 87;
    static CShaderInterpret_EmitExpr(_self, _e) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_EmitExpr, _self, _e));
    }
    static FN_CShaderInterpret_BuildVSUni = 90;
    static CShaderInterpret_BuildVSUni(_self, _shader, _in) {
        const pack = [_shader, _in];
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_BuildVSUni, _self, pack));
    }
    static FN_CShaderInterpret_EmitCastGPU = 93;
    static CShaderInterpretGPU_EmitCast(_self, _e, _want) {
        const byteLength = _want.length * 2;
        const ptr = wasmNew(byteLength);
        const buf = new Uint16Array(gMemory.buffer, ptr, _want.length);
        for (let i = 0; i < _want.length; i++)
            buf[i] = _want.charCodeAt(i);
        return afterWasm(gInstance.exports.ASM_LINK_S_OO_RO(CWASM.FN_CShaderInterpret_EmitCastGPU, ptr, _self, _e));
    }
    static FN_CShaderInterpret_EmitExprGPU = 96;
    static CShaderInterpretGPU_EmitExpr(_self, _e) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_EmitExprGPU, _self, _e));
    }
    static FN_CShaderInterpret_EmitStmtsGPU = 99;
    static CShaderInterpretGPU_EmitStmts(_self, _arr) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_EmitStmtsGPU, _self, _arr));
    }
    static FN_CShaderInterpret_BuildVSUniGPU = 102;
    static CShaderInterpretGPU_BuildVSUni(_self, _shader, _in, _compute) {
        const pack = [_shader, _in, _compute];
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CShaderInterpret_BuildVSUniGPU, _self, pack));
    }
    static FN_CMeshTreeUpdate_TreeCopy = 105;
    static FN_CMeshTreeUpdate_TreeReset = 106;
    static FN_CMeshTreeUpdate_TreeUpdateMeshAni = 107;
    static FN_CMeshTreeUpdate_TreeMeshInter = 108;
    static CMeshTreeUpdate_TreeCopy(_md, _mci, _sum, _bound) {
        const pack = [_md, _mci, _sum, _bound];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CMeshTreeUpdate_TreeCopy, pack, null);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeReset(_md, _mci) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CMeshTreeUpdate_TreeReset, _md, _mci);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeUpdateMeshAni(_pst, _st, _ed, _pmd, _amd, _mci, _all) {
        const pack = [_pst, _st, _ed, _pmd, _amd, _mci, _all];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CMeshTreeUpdate_TreeUpdateMeshAni, pack, null);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeMeshInter(_mci, _create) {
        const pack = [_mci, _create];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CMeshTreeUpdate_TreeMeshInter, pack, null);
        checkMemoryGrow();
    }
    static FN_CRenderer_ReleaseTexture = 117;
    static FN_CRenderer_ReleaseMeshDrawNode = 118;
    static CRenderer_ReleaseTexture(_self, _tex) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_ReleaseTexture, _self, _tex);
        checkMemoryGrow();
    }
    static CRenderer_ReleaseMeshDrawNode(_self, _mesh) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_ReleaseMeshDrawNode, _self, _mesh);
        checkMemoryGrow();
    }
    static FN_CRenderer_BuildRenderTarget = 123;
    static CRenderer_BuildRenderTarget(_self, _info, _size, _key) {
        const pack = [_info, _size, _key];
        const r = gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CRenderer_BuildRenderTarget, _self, pack);
        checkMemoryGrow();
        return r;
    }
    static FN_CRenderer_BuildCubeMap = 126;
    static CRenderer_BuildCubeMap(_self, _texList, _mipmap, _key) {
        const pack = [_texList, _mipmap, _key];
        const r = gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CRenderer_BuildCubeMap, _self, pack);
        checkMemoryGrow();
        return r;
    }
    static FN_CRenderer_BuildTexture = 129;
    static CRenderer_BuildTexture(_self, _tex, _ch5canvas) {
        const pack = [_tex, _ch5canvas];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_BuildTexture, _self, pack);
        checkMemoryGrow();
        return Promise.resolve();
    }
    static FN_CRenderer_BuildMeshDrawNode = 132;
    static CRenderer_BuildMeshDrawNode(_self, _mesh, _info, _vf) {
        const pack = [_mesh, _info, _vf];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_BuildMeshDrawNode, _self, pack);
        checkMemoryGrow();
    }
    static FN_CRenderer_BuildMeshAutoFix = 135;
    static CRenderer_BuildMeshAutoFix(_self, _mesh, _drawTree, _vf) {
        const pack = [_mesh, _drawTree, _vf];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_BuildMeshAutoFix, _self, pack);
        checkMemoryGrow();
    }
    static FN_CRenderer_BuildMeshDrawNodeAutoFix = 138;
    static CRenderer_BuildMeshDrawNodeAutoFix(_self, _meshDraw, _vf, _info) {
        const pack = [_meshDraw, _vf, _info];
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRenderer_BuildMeshDrawNodeAutoFix, _self, pack);
        checkMemoryGrow();
    }
    static FN_CRendererGPU_ReleaseTexture = 141;
    static CRendererGPU_ReleaseTexture(_self, _tex) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRendererGPU_ReleaseTexture, _self, _tex);
        checkMemoryGrow();
    }
    static FN_CRendererGPU_ReleaseMeshDrawNode = 144;
    static CRendererGPU_ReleaseMeshDrawNode(_self, _mesh) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CRendererGPU_ReleaseMeshDrawNode, _self, _mesh);
        checkMemoryGrow();
    }
    static FN_CRendererGPU_BuildRenderTarget = 147;
    static CRendererGPU_BuildRenderTarget(_self, _info, _size, _key) {
        const pack = [_info, _size, _key];
        const r = gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CRendererGPU_BuildRenderTarget, _self, pack);
        checkMemoryGrow();
        return r;
    }
    static FN_CRendererGPU_BuildCubeMap = 150;
    static CRendererGPU_BuildCubeMap(_self, _texList, _mipmap, _key) {
        const pack = [_texList, _mipmap, _key, globalThis.GPUTextureUsage];
        const r = gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CRendererGPU_BuildCubeMap, _self, pack);
        checkMemoryGrow();
        return r;
    }
    static FN_CStream_Push = 30;
    static FN_CStream_NextValue = 31;
    static FN_CStream_GetValue = 34;
    static FN_CStream_GetMember = 35;
    static FN_CStream_GetArray = 36;
    static FN_CStream_GetSet = 37;
    static FN_CStream_GetMap = 38;
    static CStream_Push(_obj, _val) {
        return afterWasm(gInstance.exports.ASM_LINK_OO_RO(CWASM.FN_CStream_Push, _obj, _val));
    }
    static CStream_NextValue(_obj, _value) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CStream_NextValue, _obj, _value);
        checkMemoryGrow();
    }
    static CStream_GetValue(_obj) {
        return afterWasm(gInstance.exports.ASM_LINK_O_RO(CWASM.FN_CStream_GetValue, _obj));
    }
    static CStream_GetMember(_obj, _val) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CStream_GetMember, _obj, _val);
        checkMemoryGrow();
    }
    static CStream_GetArray(_obj, _array) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CStream_GetArray, _obj, _array);
        checkMemoryGrow();
    }
    static CStream_GetSet(_obj, _set) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CStream_GetSet, _obj, _set);
        checkMemoryGrow();
    }
    static CStream_GetMap(_obj, _map) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CStream_GetMap, _obj, _map);
        checkMemoryGrow();
    }
    static Decode(_stack, _encoded, _indexOffset = 0) {
        if (gInstance == null)
            return "";
        const encoder = new TextEncoder();
        const stackBytes = encoder.encode(_stack);
        const encodedBytes = encoder.encode(_encoded);
        const exports = gInstance.exports;
        const scratchOffset = Number(exports.scratchPtr());
        const mem = new Uint8Array(gMemory.buffer);
        mem.set(stackBytes, scratchOffset);
        mem.set(encodedBytes, scratchOffset + stackBytes.length);
        const resultPtr = exports.Decode(stackBytes.length, encodedBytes.length, _indexOffset);
        checkMemoryGrow();
        return liftDecodeString(resultPtr);
    }
}
await loadSingleton();
Object.freeze(CWASM);
