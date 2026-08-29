import { CArray } from "./CArray.js";
import { CPath } from "./CPath.js";
import { CUtil } from "./CUtil.js";
import { CClass } from "./CClass.js";
import "./CHostChk.js";
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
let opCodeCache = [];
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
    const n = keyNameCache.length;
    let trueIdx = (wiredIdx - gRotBase) % n;
    if (trueIdx < 0)
        trueIdx += n;
    const name = keyNameCache[trueIdx];
    if (name === undefined) {
        throw new Error(`CWASM: keyNameCache miss at offset ${trueIdx} (wired=${wiredIdx}, base=${gRotBase})`);
    }
    return name;
}
const OP = {
    zy6ub2: 1, yy0hd6: 2, xz9bn5: 3, xe4xs2: 4, by9fa8: 5, gr3qp8: 6,
    wo9fp1: 7, bb0kr7: 8, ew1hf5: 9, jt1ek2: 10, fb9sa4: 11,
    hm8rk5: 12, xd6ln3: 13, vi1mz1: 14, cq4oi8: 15, iy4rx5: 16,
    wz1nm7: 17, se3eg3: 18, xm1mu8: 19, jf1lc2: 20, pa4yn8: 21,
    sf1ej3: 22, so5vy8: 23, ma4ka3: 24, zj0ls9: 25, oi6af2: 26,
    si1xq1: 27, nb9oh4: 28, sb5wp3: 29, za6cj8: 30, hl7zi8: 31,
    xi3fx1: 32, dl0me5: 33, hq6za4: 34, nh3ce3: 35, hq6qj7: 36,
    kn7yo2: 37, sc6jv4: 38, ae1bl8: 39, mg7lr4: 40, sy4he9: 41,
    dw9cj0: 42, ut7ua2: 43, qi3mg8: 44, zp5dt6: 45, kz8ox4: 46,
    qw0sl1: 47, kt5yl6: 48, wb0tv2: 49, kd0fu3: 50, hz4gt9: 51,
    lk8rk9: 52, bb5to9: 53, xa4fx4: 54, gx8ny8: 55, kg8jm4: 56,
    aw0rx9: 57, xj0cr1: 58, un3iv1: 59, hf9we0: 60, am2qg8: 61,
    tm4dw0: 62, qg5ww8: 63, iz0zj4: 64, kk1sw1: 65, xc3uy8: 66,
    qf4lz3: 67, gm0ix0: 68, em2jn0: 69, hb2me5: 70, ad5we2: 71,
    fj0pe9: 72, dq1eg7: 73, na7ca1: 74, ra1wx3: 75, yr8ly0: 76, mo3kp6: 77,
};
const NAME_TO_OP = {
    "iustfhfs": OP.zy6ub2, "b4twdh": OP.zy6ub2, "j76892": OP.zy6ub2, "di3d3ti3": OP.zy6ub2,
    "r9odfl3": OP.yy0hd6, "h5ydpda8": OP.yy0hd6, "m33s7yf0": OP.yy0hd6,
    "uxr3mh4": OP.xz9bn5, "tnnyez1": OP.xz9bn5, "n4gf2d0e": OP.xz9bn5, "emh83b25": OP.xz9bn5,
    "kzkcai": OP.xe4xs2, "rnj5aohn": OP.xe4xs2, "ddo2hvt": OP.xe4xs2, "nhjwptb8": OP.xe4xs2,
    "l81koa": OP.by9fa8, "l1zbv6": OP.by9fa8, "c9fhpqt": OP.by9fa8, "xoq70k": OP.by9fa8,
    "tmwd0m": OP.gr3qp8, "f447z2n": OP.gr3qp8, "ccl9gcb": OP.gr3qp8, "dbd9f0": OP.gr3qp8,
    "pb57ia": OP.wo9fp1,
    "gnhwjn": OP.bb0kr7, "pr5d36pi": OP.bb0kr7, "xri5xqm": OP.bb0kr7,
    "wbday1": OP.ew1hf5, "vrjo2nan": OP.ew1hf5,
    "n5zgjsu": OP.jt1ek2, "aqa8yf": OP.jt1ek2,
    "gylu44": OP.fb9sa4, "o5debga": OP.fb9sa4,
    "rx83te": OP.hm8rk5, "sum849": OP.hm8rk5,
    "crvach": OP.xd6ln3, "qailr7": OP.xd6ln3,
    "zg5i6x1p": OP.vi1mz1, "nfx989": OP.vi1mz1, "b4ixuiy": OP.vi1mz1,
    "sxj6cq": OP.cq4oi8, "p0az8t10": OP.cq4oi8,
    "ffsseqr4": OP.iy4rx5, "ok5mngk": OP.iy4rx5, "jjj2nv": OP.iy4rx5,
    "xvdyr776": OP.wz1nm7,
    "jhoqtdkn": OP.se3eg3,
    "o7itpj": OP.xm1mu8,
    "zyc64d9r": OP.jf1lc2,
    "n8df2qt": OP.pa4yn8,
    "ziuqpz2q": OP.sf1ej3,
    "zn6qg6y": OP.so5vy8,
    "o7s564": OP.ma4ka3,
    "ywftq76": OP.zj0ls9,
    "vf9d9x4": OP.oi6af2,
    "j9ima6": OP.si1xq1,
    "l9bs2j0": OP.nb9oh4,
    "j8a6y89": OP.sb5wp3,
    "i88lhb": OP.za6cj8,
    "o8ccyls": OP.hl7zi8,
    "h793pp36": OP.xi3fx1,
    "m1epgm": OP.dl0me5, "lu64pw": OP.dl0me5,
    "x5ibtshk": OP.hq6za4,
    "xj6875s": OP.nh3ce3,
    "wwu4fn": OP.hq6qj7,
    "fkx978i": OP.kn7yo2,
    "yj9dtyk": OP.sc6jv4, "gb9xtjs": OP.sc6jv4, "ooawz1l": OP.sc6jv4, "i7x2wc": OP.sc6jv4,
    "sh9tlnu1": OP.ae1bl8, "ksmbdn": OP.ae1bl8, "xkhx81o": OP.ae1bl8,
    "mrl724e": OP.mg7lr4,
    "x4l9a3u": OP.sy4he9,
    "mjoap8": OP.dw9cj0,
    "gguzuadw": OP.ut7ua2,
    "r6o7fs8u": OP.qi3mg8,
    "qk2jyipv": OP.zp5dt6,
    "tk51mai": OP.kz8ox4,
    "ex7titq": OP.qw0sl1,
    "bb76yn": OP.kt5yl6,
    "uklwhdt5": OP.wb0tv2,
    "dnn641z": OP.kd0fu3,
    "tf5sgl": OP.hz4gt9,
    "iwvn2wod": OP.lk8rk9,
    "npl8nsmw": OP.bb5to9,
    "d3kswr": OP.xa4fx4,
    "u284ga": OP.gx8ny8,
    "z0x9zvvd": OP.kg8jm4, "hq3mdxa1": OP.kg8jm4, "vt78zwrq": OP.kg8jm4, "cn2ubhz9": OP.kg8jm4,
    "u8wdweu": OP.aw0rx9, "pf49tsan": OP.aw0rx9, "ykq9d3vh": OP.aw0rx9, "wzq2fbmc": OP.aw0rx9,
    "opkhzzt": OP.xj0cr1,
    "hdz97t01": OP.un3iv1,
    "wfijd1v5": OP.hf9we0, "gbnumu": OP.hf9we0, "gfvf8swu": OP.hf9we0, "uut6tx15": OP.hf9we0,
    "ibg35b4n": OP.am2qg8,
    "do4l74": OP.tm4dw0,
    "wi79muy": OP.qg5ww8,
    "notylf": OP.iz0zj4,
    "pr6ciry": OP.kk1sw1,
    "mnjikh": OP.xc3uy8,
    "l0zd71": OP.qf4lz3,
    "fm1l98": OP.gm0ix0,
    "dzb6qs": OP.em2jn0,
    "jziw6yot": OP.hb2me5,
    "u84qru": OP.ad5we2,
    "xwpraz0": OP.fj0pe9,
    "qkwqa1": OP.dq1eg7,
    "evp3bbn": OP.na7ca1,
    "tg45fy82": OP.ra1wx3,
    "p99jx9s": OP.yr8ly0,
    "ob5a0ms7": OP.mo3kp6,
};
function jsLinkDispatch(linkId, p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11) {
    checkMemoryGrow();
    switch (opCodeCache[linkId]) {
        case 1: {
            const obj = p0, keyIndex = p1;
            return obj[getKeyName(keyIndex)];
        }
        case 2:
        case 37: {
            const obj = p0, keyIndex = p1, value = p2;
            obj[getKeyName(keyIndex)] = value;
            return null;
        }
        case 3: {
            const obj = p0, methodIndex = p1;
            return obj[getKeyName(methodIndex)]();
        }
        case 4:
        case 6: {
            const obj = p0, methodIndex = p1, a0 = p2;
            return obj[getKeyName(methodIndex)](a0);
        }
        case 5: {
            const obj = p0, methodIndex = p1, a0 = p2;
            return obj[getKeyName(methodIndex)](readAsString(a0));
        }
        case 7: {
            const obj = p0, methodIndex = p1, a0 = p2;
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
        case 8:
        case 10:
        case 14:
        case 16: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3;
            return obj[getKeyName(methodIndex)](a0, a1);
        }
        case 9:
        case 15: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3;
            return obj[getKeyName(methodIndex)](a0, readAsString(a1));
        }
        case 11:
        case 13: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3;
            return obj[getKeyName(methodIndex)](readAsString(a0), a1);
        }
        case 12: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3;
            return obj[getKeyName(methodIndex)](readAsString(a0), readAsString(a1));
        }
        case 17:
        case 27: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4;
            obj[getKeyName(methodIndex)](a0, a1, a2);
            return null;
        }
        case 18:
        case 25: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4);
            return null;
        }
        case 19:
        case 24:
        case 28: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3);
            return null;
        }
        case 20: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5;
            return obj[getKeyName(methodIndex)](a0, a1, a2, a3);
        }
        case 21: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5;
            obj[getKeyName(methodIndex)](a0, readAsString(a1), a2, a3);
            return null;
        }
        case 22: {
            const v = p0;
            return (typeof HTMLCanvasElement !== "undefined" && v instanceof HTMLCanvasElement) ? 1 : 0;
        }
        case 23:
        case 29:
        case 32:
        case 33: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4;
            return obj[getKeyName(methodIndex)](a0, a1, a2);
        }
        case 26:
        case 34: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5);
            return null;
        }
        case 30: {
            const v = p0;
            return (typeof Image !== "undefined" && v instanceof Image) ? 1 : 0;
        }
        case 31: {
            const v = p0;
            return (typeof HTMLVideoElement !== "undefined" && v instanceof HTMLVideoElement) ? 1 : 0;
        }
        case 35: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7, a6 = p8, a7 = p9, a8 = p10;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8);
            return null;
        }
        case 36: {
            const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7, a6 = p8, a7 = p9, a8 = p10, a9 = p11;
            obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            return null;
        }
        case 38: {
            const v = p0;
            if (typeof v === "number")
                return v;
            if (typeof v === "boolean")
                return v ? 1 : 0;
            return 0;
        }
        case 39: {
            const arr = p0, i = p1;
            return arr[i];
        }
        case 40: {
            const arr = p0, i = p1, value = p2;
            arr[i] = value;
            return null;
        }
        case 41: {
            const v = p0;
            return (v === null || v === undefined) ? 1 : 0;
        }
        case 42: {
            const a = p0, b = p1;
            return (a === b) ? 1 : 0;
        }
        case 43: {
            const obj = p0, ctor = p1;
            return (obj instanceof ctor) ? 1 : 0;
        }
        case 44: {
            const v = p0;
            return (v === undefined) ? 1 : 0;
        }
        case 45: {
            const classIndex = p0, arg0Ptr = p1;
            return CClass.New(getKeyName(classIndex), [readAsString(arg0Ptr)]);
        }
        case 46: {
            const classIndex = p0;
            return CClass.New(getKeyName(classIndex), []);
        }
        case 47:
        case 50: {
            const classIndex = p0, a0 = p1;
            return CClass.New(getKeyName(classIndex), [a0]);
        }
        case 48:
        case 49: {
            const classIndex = p0, a0 = p1, a1 = p2, a2 = p3;
            return CClass.New(getKeyName(classIndex), [a0, a1, a2]);
        }
        case 51: {
            const classIndex = p0, a0 = p1, a1 = p2, a2 = p3, a3 = p4;
            return CClass.New(getKeyName(classIndex), [a0, a1, a2, a3]);
        }
        case 52:
        case 53: {
            const classIndex = p0, a0 = p1, a1 = p2;
            return CClass.New(getKeyName(classIndex), [a0, a1]);
        }
        case 54: {
            const classIndex = p0;
            return CClass.Find(getKeyName(classIndex));
        }
        case 55: return [];
        case 56: {
            const obj = p0, keyIndex = p1;
            const raw = obj[getKeyName(keyIndex)];
            const str = (typeof raw === "string") ? raw : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let i = 0; i < str.length; i++)
                buf[i] = str.charCodeAt(i);
            return ptr;
        }
        case 57: {
            const obj = p0, keyIndex = p1;
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
        case 58: {
            const obj = p0;
            return Object.keys(obj);
        }
        case 59: {
            const arr = p0, i = p1;
            const str = (typeof arr[i] === "string") ? arr[i] : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 60: {
            const v = p0;
            const str = (typeof v === "string") ? v : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 61: {
            const v = p0;
            const str = String(v);
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++)
                buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 62: {
            const ptr = p0;
            try {
                return JSON.parse(readAsString(ptr));
            }
            catch (e) {
                return null;
            }
        }
        case 63: {
            const ptr = p0;
            return Number(readAsString(ptr));
        }
        case 64: return null;
        case 65: {
            const classIndex = p0, argsArr = p1;
            return CClass.New(getKeyName(classIndex), argsArr);
        }
        case 66: {
            const v = p0;
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
        case 67: {
            const n = p0;
            return n;
        }
        case 68: {
            const ptr = p0;
            return readAsString(ptr);
        }
        case 69: {
            const b = p0;
            return b !== 0;
        }
        case 70: {
            const obj = p0;
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
        case 71: return {};
        case 72: {
            const obj = p0, keyIndex = p1, valuePtr = p2;
            obj[getKeyName(keyIndex)] = readAsString(valuePtr);
            return null;
        }
        case 73: {
            const v = p0;
            return Array.from(v);
        }
        case 74: {
            const obj = p0;
            return new obj.constructor();
        }
        case 75: {
            const obj = p0, arg0 = p1;
            return new obj.constructor(arg0);
        }
        case 76: {
            const arg0 = p0;
            return new Uint8Array(arg0);
        }
        case 77: {
            const kind = p0, msgPtr = p1;
            const msg = readAsString(msgPtr);
            const CAlert = CClass.Find("CAlert");
            switch (kind) {
                case 0:
                    CAlert?.E(msg);
                    break;
                case 1:
                    CAlert?.W(msg);
                    break;
                case 2:
                    CAlert?.Info(msg);
                    break;
                case 3:
                    CAlert?.Warning(msg);
                    break;
                case 4:
                    CAlert?.Error(msg);
                    break;
                case 5:
                    alert(msg);
                    break;
            }
            return null;
        }
    }
    throw new Error(`CWASM: jsLinkDispatch unknown linkId (linkId=${linkId})`);
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
                    const op = NAME_TO_OP[name];
                    if (op !== undefined)
                        opCodeCache[offset] = op;
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
    gMemory = new WebAssembly.Memory({ initial: 512, maximum: 2048 });
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
    const k3nUa = (typeof navigator !== "undefined") ? navigator.userAgent : "";
    const k3nTouch = (typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number") ? navigator.maxTouchPoints : 0;
    let k3nCoarse = 0;
    try {
        k3nCoarse = (typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches) ? 1 : 0;
    }
    catch {
    }
    const k3nHw = (typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number") ? navigator.hardwareConcurrency : 0;
    const k3nElectron = (typeof process !== "undefined" && process.versions && process.versions.electron != null) ? 1 : 0;
    const k3nStr = `${k3nUa}|${k3nTouch}|${k3nCoarse}|${k3nHw}|${k3nElectron}`;
    const k3nBytes = new TextEncoder().encode(k3nStr);
    const k3nOff = Number(gInstance.exports.scratchPtr());
    new Uint8Array(gMemory.buffer, k3nOff, k3nBytes.length).set(k3nBytes);
    gInstance.exports.k3n(k3nBytes.length);
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
const RES_TAG_A = "3981151161_3655399013";
const RES_TAG_B = "1884747724_4049602760";
const gArtgineBytesCache = new Map();
export class CWASM {
    static async LoadArtgineBytes(_relPath) {
        const cached = gArtgineBytesCache.get(_relPath);
        if (cached != null)
            return cached;
        const path = CUtil.IsNode()
            ? CPath.ArtgineRootPath() + _relPath
            : CPath.WebRootArtgineUrl() + _relPath;
        if (CUtil.IsNode()) {
            const fs = await import("fs/promises");
            const bytes = await fs.readFile(path);
            gArtgineBytesCache.set(_relPath, bytes);
            return bytes;
        }
        const res = await fetch(path);
        const bytes = await res.arrayBuffer();
        gArtgineBytesCache.set(_relPath, bytes);
        return bytes;
    }
    static GetArtgineBytesSyncPtr(_relPath) {
        const cached = gArtgineBytesCache.get(_relPath);
        if (cached == null)
            return 0;
        const u8 = cached instanceof Uint8Array ? cached : new Uint8Array(cached);
        if (u8.byteLength === 0)
            return 0;
        const ptr = wasmNew(u8.byteLength);
        new Uint8Array(gMemory.buffer, ptr, u8.byteLength).set(u8);
        return ptr;
    }
    static GetElectronInfo() {
        const isElectron = typeof process !== "undefined" && !!process.versions
            && process.versions.electron != null;
        return isElectron ? String(process.versions.electron) : "";
    }
    static GetPlatformInfo() {
        if (CUtil.IsNode() && typeof process !== "undefined") {
            return `node|${process.platform}|${process.version}`;
        }
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        return `browser|${ua}`;
    }
    static GetStackInfo() {
        return new Error().stack || "";
    }
    static GetExecArgvInfo() {
        return (typeof process !== "undefined" && process.execArgv)
            ? process.execArgv.join(" ")
            : "";
    }
    static GetResourcePath() {
        return "artgine/wasm/" + (gIsSimd ? "ASM_SIMD.wasm" : "ASM.wasm");
    }
    static GetResourceTag() {
        return gIsSimd ? RES_TAG_B : RES_TAG_A;
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
    static FN_CCanvas_Update = 153;
    static CCanvas_Update(_canvas, _update) {
        gInstance.exports.ASM_LINK_OO(CWASM.FN_CCanvas_Update, _canvas, _update);
        checkMemoryGrow();
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
CClass.Push(CWASM);
await loadSingleton();
Object.freeze(CWASM);
