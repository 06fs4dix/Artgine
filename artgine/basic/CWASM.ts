import {CArray} from "./CArray.js";
import { CPath } from "./CPath.js";
import { CUtil } from "./CUtil.js";
import { CClass } from "./CClass.js";
import "./CHostChk.js";

var g_F32A2=new CArray<Float32Array>();
var g_F32A3=new CArray<Float32Array>();
var g_F32A4=new CArray<Float32Array>();
var g_F32A16=new CArray<Float32Array>();
var g_F32A24=new CArray<Float32Array>();

var gThread=true;
let gAsyncReqId = 0;


var gMemory: WebAssembly.Memory = null;
var gInstance: WebAssembly.Instance = null;
var gIsSimd = false;
var gArrayBufferId: number = 0;
var gLastBuffer: ArrayBuffer = null;
var gLastBufferLen = 0;
let gOctResultBuf: Int32Array=null;
let gGjkBuf: Float32Array=null;
let gGjkResultBuf: Float32Array=null;

type IWasmF32Owner = { mF32A: Float32Array };
const gF32Owners: IWasmF32Owner[] = [];
const gOctInsOwners: Array<{ _insBuf?: Float32Array }> = [];

function markView<T extends Float32Array | Int32Array | Uint32Array>(_arr: T, _ptr: number, _len: number): T
{
    _arr["ptr"]=_ptr;
    _arr["len"]=_len;
    return _arr;
}
function rebaseF32(_arr: Float32Array): Float32Array
{
    if(_arr==null || _arr["ptr"]==null)  return _arr;
    if(gMemory!=null && _arr.buffer===gMemory.buffer)  return _arr;
    const ptr=_arr["ptr"] as number;
    const len=_arr["len"] as number;
    if(len==null || len<=0)  return _arr;
    return markView(new Float32Array(gMemory.buffer, ptr, len), ptr, len);
}
function rebaseI32(_arr: Int32Array): Int32Array
{
    if(_arr==null || _arr["ptr"]==null)  return _arr;
    if(gMemory!=null && _arr.buffer===gMemory.buffer)  return _arr;
    const ptr=_arr["ptr"] as number;
    const len=_arr["len"] as number;
    if(len==null || len<=0)  return _arr;
    return markView(new Int32Array(gMemory.buffer, ptr, len), ptr, len);
}
function rebasePool(_pool: CArray<Float32Array>): void
{
    for(let i=0;i<_pool.Size();++i)
    {
        const a=_pool.Find(i);
        if(a!=null)  _pool.Modify(i, rebaseF32(a));
    }
}
function rebaseAllViews(): void
{
    rebasePool(g_F32A2);
    rebasePool(g_F32A3);
    rebasePool(g_F32A4);
    rebasePool(g_F32A16);
    rebasePool(g_F32A24);
    if(gOctResultBuf!=null)  gOctResultBuf=rebaseI32(gOctResultBuf);
    if(gGjkBuf!=null)  gGjkBuf=rebaseF32(gGjkBuf);
    if(gGjkResultBuf!=null)  gGjkResultBuf=rebaseF32(gGjkResultBuf);
    for(let i=0;i<gOctInsOwners.length;++i)
    {
        const mgr=gOctInsOwners[i];
        if(mgr!=null && mgr._insBuf!=null)
            mgr._insBuf=rebaseF32(mgr._insBuf);
    }
    for(let i=0;i<gF32Owners.length;++i)
    {
        const o=gF32Owners[i];
        if(o!=null && o.mF32A!=null)
            o.mF32A=rebaseF32(o.mF32A);
    }
}
function checkMemoryGrow(): void
{
    if(gMemory==null)  return;
    const buf=gMemory.buffer;
    if(buf===gLastBuffer)  return;
    const oldLen=gLastBufferLen;
    gLastBuffer=buf;
    gLastBufferLen=buf.byteLength;
    
    rebaseAllViews();
}
function afterWasm<T>(_value: T): T
{
    checkMemoryGrow();
    return _value;
}
function wasmNew(_byteLength: number): number
{
    const newFn=gInstance.exports.__new as (size: number, id: number)=>number;
    const pinFn=gInstance.exports.__pin as (ptr: number)=>number;
    const ptr=newFn(_byteLength, gArrayBufferId);
    pinFn(ptr);
    checkMemoryGrow();
    return ptr;
}

const textDecoder = new TextDecoder("utf-16le");

// AS 쪽 CASM.ts의 PERM_SIZE(4096=2^12, permTable 크기)와 반드시 같은 값이어야 한다 - 둘 중
//하나만 바뀌면 회전(rotation) 복원이 조용히 엉뚱한 오프셋을 가리키게 된다. 2의 거듭제곱이라
// 모듈러(%)를 비트마스크(&)로 대체할 수 있고, 항상 이 고정 크기로 배열을 채워두면(.fill)
// permTable이 뒤섞어 돌려주는 오프셋이 어떤 순서로 와도 hole 없이 packed 상태가 유지된다
// (V8 holey/dictionary-mode 강등 방지 - jsLinkDispatch/getKeyName 핫패스 인덱싱 속도에 직결).
const KEY_SLOT_CAP = 4096;
const KEY_SLOT_MASK = KEY_SLOT_CAP - 1;
let keyNameCache: string[] = new Array(KEY_SLOT_CAP).fill(undefined);
let opCodeCache: number[] = new Array(KEY_SLOT_CAP).fill(0);

// getKeyName 회전 복원 결과의 구간(epoch) 캐시. gRotBase는 jsSetArrPos 호출 시점(게이트웨이
// 진입/탈출)에만 바뀌므로, 그 사이(같은 epoch)에는 같은 wiredIdx가 항상 같은 이름으로
// 풀린다 - 그래서 매번 재계산하지 않고 wiredIdx 슬롯에 이름+epoch 태그를 캐싱해뒀다가
// epoch가 같으면 배열 읽기 한 번으로 끝낸다. epoch가 바뀌면 태그 불일치로 자연히 무효화되니
// 캐시 배열 자체를 지울 필요는 없다.
let gRotBase = 0;
let gRotEpoch = 0;
const resolvedNameCache: string[] = new Array(KEY_SLOT_CAP).fill(undefined);
const resolvedNameEpoch: number[] = new Array(KEY_SLOT_CAP).fill(-1);

const WIRE_STEP = 197;
const gSessionSeed: number = (() => {
    try {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] & 0xFFFF;
    } catch {
        return Math.floor(Math.random() * 0x10000);
    }
})();

function readAsString(ptr: number): string {
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

function getKeyName(wiredIdx: number): string {
    if (resolvedNameEpoch[wiredIdx] === gRotEpoch) {
        return resolvedNameCache[wiredIdx];
    }
    // (wiredIdx - gRotBase) & KEY_SLOT_MASK: JS의 & 는 32비트 두 보수 연산이라 음수 결과도
    // %와 동일하게 [0, KEY_SLOT_CAP) 범위로 감싸준다 - 별도 음수 보정 분기가 필요 없다
    // (AS 쪽 SetKeyBase/_wireIdx와 동일한 방식, CASM.ts 참고).
    const trueIdx = (wiredIdx - gRotBase) & KEY_SLOT_MASK;
    const name = keyNameCache[trueIdx];
    if (name === undefined) {
        throw new Error(`CWASM: keyNameCache miss at offset ${trueIdx} (wired=${wiredIdx}, base=${gRotBase})`);
    }
    resolvedNameCache[wiredIdx] = name;
    resolvedNameEpoch[wiredIdx] = gRotEpoch;
    return name;
}

// linkId(op-code) resolution cache: linkId is a wired (rotated) index like any other key.
// The dispatch switch used to do switch(getKeyName(linkId)) on every call, decoding the
// string and matching it against string case labels. Since gRotBase can rotate multiple
// times per session (including re-entrant rotation), linkId itself can't be a stable switch
// value, but the recovered trueIdx (its fixed slot in keyNameCache) is stable for the whole
// session. So we resolve the op-code once per trueIdx and cache it as a plain number,
// letting every later call for that trueIdx skip straight to a numeric switch.
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
} as const;

const NAME_TO_OP: Record<string, number> = {
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

// linkId is now sent unrotated by the AS side (CASM._opId) specifically for op-code args,
// so it's already the direct, stable index into opCodeCache - no gRotBase math needed here
// (unlike getKeyName, which still resolves real rotated key indices). opCodeCache is filled
// eagerly in jsMergeKeys (see buildImportObject below) as each name arrives, so dispatch is
// a single array read - no lazy resolution on the hot path.
function jsLinkDispatch(linkId: number, p0?: any, p1?: any, p2?: any, p3?: any, p4?: any, p5?: any, p6?: any, p7?: any, p8?: any, p9?: any, p10?: any, p11?: any): any {
    checkMemoryGrow();
    switch (opCodeCache[linkId]) {
        case 1: { const obj = p0, keyIndex = p1; return obj[getKeyName(keyIndex)]; }
        case 2: case 37: { const obj = p0, keyIndex = p1, value = p2; obj[getKeyName(keyIndex)] = value; return null; }
        case 3: { const obj = p0, methodIndex = p1; return obj[getKeyName(methodIndex)](); }
        case 4: case 6: { const obj = p0, methodIndex = p1, a0 = p2; return obj[getKeyName(methodIndex)](a0); }
        case 5: { const obj = p0, methodIndex = p1, a0 = p2; return obj[getKeyName(methodIndex)](readAsString(a0)); }
        case 7: {
            const obj = p0, methodIndex = p1, a0 = p2;
            const reqId = ++gAsyncReqId;
            const arg = readAsString(a0);
            Promise.resolve(obj[getKeyName(methodIndex)](arg))
                .then((data: ArrayBuffer | Uint8Array | null) => {
                    const u8 = data == null ? new Uint8Array(0) : (data instanceof Uint8Array ? data : new Uint8Array(data));
                    let ptr = 0;
                    if (u8.byteLength > 0) {
                        ptr = wasmNew(u8.byteLength);
                        new Uint8Array(gMemory.buffer, ptr, u8.byteLength).set(u8);
                    }
                    checkMemoryGrow();
                    (gInstance.exports.OnAsyncD as (reqId: number, ptr: number, len: number) => void)(reqId, ptr, u8.byteLength);
                })
                .catch(() => {
                    (gInstance.exports.OnAsyncD as (reqId: number, ptr: number, len: number) => void)(reqId, 0, -1);
                });
            return reqId;
        }
        case 8: case 10: case 14: case 16: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3; return obj[getKeyName(methodIndex)](a0, a1); }
        case 9: case 15: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3; return obj[getKeyName(methodIndex)](a0, readAsString(a1)); }
        case 11: case 13: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3; return obj[getKeyName(methodIndex)](readAsString(a0), a1); }
        case 12: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3; return obj[getKeyName(methodIndex)](readAsString(a0), readAsString(a1)); }
        case 17: case 27: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4; obj[getKeyName(methodIndex)](a0, a1, a2); return null; }
        case 18: case 25: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6; obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4); return null; }
        case 19: case 24: case 28: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5; obj[getKeyName(methodIndex)](a0, a1, a2, a3); return null; }
        case 20: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5; return obj[getKeyName(methodIndex)](a0, a1, a2, a3); }
        case 21: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5; obj[getKeyName(methodIndex)](a0, readAsString(a1), a2, a3); return null; }
        case 22: { const v = p0; return (typeof HTMLCanvasElement !== "undefined" && v instanceof HTMLCanvasElement) ? 1 : 0; }
        case 23: case 29: case 32: case 33: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4; return obj[getKeyName(methodIndex)](a0, a1, a2); }
        case 26: case 34: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7; obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5); return null; }
        case 30: { const v = p0; return (typeof Image !== "undefined" && v instanceof Image) ? 1 : 0; }
        case 31: { const v = p0; return (typeof HTMLVideoElement !== "undefined" && v instanceof HTMLVideoElement) ? 1 : 0; }
        case 35: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7, a6 = p8, a7 = p9, a8 = p10; obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8); return null; }
        case 36: { const obj = p0, methodIndex = p1, a0 = p2, a1 = p3, a2 = p4, a3 = p5, a4 = p6, a5 = p7, a6 = p8, a7 = p9, a8 = p10, a9 = p11; obj[getKeyName(methodIndex)](a0, a1, a2, a3, a4, a5, a6, a7, a8, a9); return null; }
        case 38: {
            const v = p0;
            if (typeof v === "number") return v;
            if (typeof v === "boolean") return v ? 1 : 0;
            return 0;
        }
        case 39: { const arr = p0, i = p1; return arr[i]; }
        case 40: { const arr = p0, i = p1, value = p2; arr[i] = value; return null; }
        case 41: { const v = p0; return (v === null || v === undefined) ? 1 : 0; }
        case 42: { const a = p0, b = p1; return (a === b) ? 1 : 0; }
        case 43: { const obj = p0, ctor = p1; return (obj instanceof ctor) ? 1 : 0; }
        case 44: { const v = p0; return (v === undefined) ? 1 : 0; }
        case 45: { const classIndex = p0, arg0Ptr = p1; return CClass.New(getKeyName(classIndex), [readAsString(arg0Ptr)]); }
        case 46: { const classIndex = p0; return CClass.New(getKeyName(classIndex), []); }
        case 47: case 50: { const classIndex = p0, a0 = p1; return CClass.New(getKeyName(classIndex), [a0]); }
        case 48: case 49: { const classIndex = p0, a0 = p1, a1 = p2, a2 = p3; return CClass.New(getKeyName(classIndex), [a0, a1, a2]); }
        case 51: { const classIndex = p0, a0 = p1, a1 = p2, a2 = p3, a3 = p4; return CClass.New(getKeyName(classIndex), [a0, a1, a2, a3]); }
        case 52: case 53: { const classIndex = p0, a0 = p1, a1 = p2; return CClass.New(getKeyName(classIndex), [a0, a1]); }
        case 54: { const classIndex = p0; return CClass.Find(getKeyName(classIndex)); }
        case 55: return [];
        case 56: {
            const obj = p0, keyIndex = p1;
            const raw = obj[getKeyName(keyIndex)];
            const str: string = (typeof raw === "string") ? raw : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
            return ptr;
        }
        case 57: {
            const obj = p0, keyIndex = p1;
            const key = getKeyName(keyIndex);
            let src: ArrayLike<number> = obj[key];
            const count = (src as any)["len"] ?? src.length;
            const byteLength = count * 4;
            const ptr = wasmNew(byteLength);
            src = obj[key];
            const n = (src as any)["len"] ?? src.length;
            new Float32Array(gMemory.buffer, ptr, n).set(src);
            return ptr;
        }
        case 58: { const obj = p0; return Object.keys(obj); }
        case 59: {
            const arr = p0, i = p1;
            const str: string = (typeof arr[i] === "string") ? arr[i] : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++) buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 60: {
            const v = p0;
            const str: string = (typeof v === "string") ? v : "";
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++) buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 61: {
            const v = p0;
            const str: string = String(v);
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++) buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 62: { const ptr = p0; try { return JSON.parse(readAsString(ptr)); } catch (e) { return null; } }
        case 63: { const ptr = p0; return Number(readAsString(ptr)); }
        case 64: return null;
        case 65: { const classIndex = p0, argsArr = p1; return CClass.New(getKeyName(classIndex), argsArr); }
        case 66: {
            const v = p0;
            let str: string;
            try { str = JSON.stringify(v) ?? ""; } catch (e) { str = ""; }
            const byteLength = str.length * 2;
            const ptr = wasmNew(byteLength);
            const buf = new Uint16Array(gMemory.buffer, ptr, str.length);
            for (let k = 0; k < str.length; k++) buf[k] = str.charCodeAt(k);
            return ptr;
        }
        case 67: { const n = p0; return n; }
        case 68: { const ptr = p0; return readAsString(ptr); }
        case 69: { const b = p0; return b !== 0; }
        case 70: {
            const obj = p0;
            if (obj === null || obj === undefined) return 0;
            if (typeof obj.IsShould === "function" && typeof obj.EditChange === "function") return 1;
            if (obj instanceof Array) return 2;
            if (obj instanceof Float32Array) return 3;
            if (obj instanceof Uint8Array) return 4;
            if (obj instanceof Uint16Array) return 5;
            if (obj instanceof Int32Array) return 6;
            if (obj instanceof Uint32Array) return 7;
            if (obj instanceof Set) return 8;
            if (obj instanceof Map) return 9;
            if (obj instanceof ArrayBuffer) return 10;
            const t = typeof obj;
            if (t === "string") return 11;
            if (t === "number") return 12;
            if (t === "boolean") return 13;
            return 14;
        }
        case 71: return {};
        case 72: { const obj = p0, keyIndex = p1, valuePtr = p2; obj[getKeyName(keyIndex)] = readAsString(valuePtr); return null; }
        case 73: { const v = p0; return Array.from(v); }
        case 74: { const obj = p0; return new obj.constructor(); }
        case 75: { const obj = p0, arg0 = p1; return new obj.constructor(arg0); }
        case 76: { const arg0 = p0; return new Uint8Array(arg0); }
        case 77: {
            const kind = p0, msgPtr = p1;
            const msg = readAsString(msgPtr);
            const CAlert = CClass.Find("CAlert");
            switch (kind) {
                case 0: CAlert?.E(msg); break;
                case 1: CAlert?.W(msg); break;
                case 2: CAlert?.Info(msg); break;
                case 3: CAlert?.Warning(msg); break;
                case 4: CAlert?.Error(msg); break;
                case 5: alert(msg); break;
            }
            return null;
        }
    }
    throw new Error(`CWASM: jsLinkDispatch unknown linkId (linkId=${linkId})`);
}

function buildImportObject(): WebAssembly.Imports {
    return {
        index: {
            jsMergeKeys: (deltaPtr: number) => {
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
                    if (entry === "") continue;
                    const sep = entry.indexOf(String.fromCharCode(2));
                    const offset = parseInt(entry.substring(0, sep), 10);
                    const name = entry.substring(sep + 1);
                    // keyNameCache/opCodeCache는 위에서 이미 KEY_SLOT_CAP(4096) 크기로
                    // .fill()해뒀으므로 offset이 permTable로 뒤섞여 어떤 순서로 와도
                    // hole 없이 packed 상태가 유지된다 - 그냥 직접 대입하면 된다.
                    keyNameCache[offset] = name;
                    const op = NAME_TO_OP[name];
                    if (op !== undefined) opCodeCache[offset] = op;
                }
            },
            jsSetArrPos: (pos: number) => {
                gRotBase = pos;
                // 회전 기준이 바뀌었으니 getKeyName의 epoch 캐시를 무효화한다(배열을 지울
                // 필요 없이 태그만 새 값으로 넘기면 이전 결과는 자연히 미스 처리된다).
                gRotEpoch++;
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
            abort: (msgPtr: number, fileNamePtr: number, line: number, column: number) => {
                throw new Error(`CWASM abort: ${readAsString(msgPtr)} at ${readAsString(fileNamePtr)}:${line}:${column}`);
            },
            seed: (): number => Date.now(),
            memory: gMemory,
        },
    };
}

async function instantiate(fileName: string, bytes?: ArrayBuffer | Uint8Array): Promise<WebAssembly.Instance> {
    gMemory = new WebAssembly.Memory({ initial: 512, maximum: 2048 });
    gLastBuffer = gMemory.buffer;
    gLastBufferLen = gLastBuffer.byteLength;
    const wasmBytes = bytes ?? await CWASM.LoadArtgineBytes("artgine/wasm/" + fileName);
    const { instance } = await WebAssembly.instantiate(wasmBytes as BufferSource, buildImportObject());
    return instance;
}

async function loadSingleton(): Promise<void> {
    let simdBytes: ArrayBuffer | Uint8Array | null = null;
    try {
        const bytes = await CWASM.LoadArtgineBytes("artgine/wasm/ASM_SIMD.wasm");
        if (WebAssembly.validate(bytes as BufferSource)) simdBytes = bytes;
    } catch (e) {
    }

    gIsSimd = simdBytes != null;
    gInstance = gIsSimd
        ? await instantiate("ASM_SIMD.wasm", simdBytes)
        : await instantiate("ASM.wasm");

    gArrayBufferId = (gInstance.exports.ARRAYBUFFER_ID as WebAssembly.Global).value;

    const k3nUa = (typeof navigator !== "undefined") ? navigator.userAgent : "";
    const k3nTouch = (typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number") ? navigator.maxTouchPoints : 0;
    let k3nCoarse = 0;
    try {
        k3nCoarse = (typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches) ? 1 : 0;
    } catch {
    }
    const k3nHw = (typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number") ? navigator.hardwareConcurrency : 0;
    const k3nElectron = (typeof process !== "undefined" && (process as any).versions && (process as any).versions.electron != null) ? 1 : 0;
    const k3nStr = `${k3nUa}|${k3nTouch}|${k3nCoarse}|${k3nHw}|${k3nElectron}`;
    const k3nBytes = new TextEncoder().encode(k3nStr);
    const k3nOff = Number((gInstance.exports.scratchPtr as () => number)());
    new Uint8Array(gMemory.buffer, k3nOff, k3nBytes.length).set(k3nBytes);
    (gInstance.exports.k3n as (len: number) => void)(k3nBytes.length);
}


function allocRaw(byteLength: number): number {
    return wasmNew(byteLength);
}

const OCT_RESULT_CAP=16384;
function octResultBuf(): Int32Array
{
    checkMemoryGrow();
    if(gOctResultBuf==null)
    {
        const ptr=allocRaw(OCT_RESULT_CAP*4);
        gOctResultBuf=markView(new Int32Array(gMemory.buffer, ptr, OCT_RESULT_CAP), ptr, OCT_RESULT_CAP);
    }
    return gOctResultBuf;
}
function octReadResults(_buf: Int32Array): Array<number>
{
    const out: Array<number>=[];
    for(let i=0;i<_buf.length;++i)
    {
        const v=_buf[i];
        if(v===-1)  break;
        out.push(v);
    }
    return out;
}

const OCT_INSERT_STRIDE=15;
function octInsertBufEnsure(_mgr: any, _minRecords: number): void
{
    checkMemoryGrow();
    const curCap=_mgr["_insCap"]||0;
    if(_mgr["_insBuf"]!=null && curCap>=_minRecords)  return;

    const newCap=Math.max(_minRecords, curCap>0?curCap*2:1024);
    const ptr=allocRaw(newCap*OCT_INSERT_STRIDE*4);
    const newLen=newCap*OCT_INSERT_STRIDE;
    const newBuf=markView(new Float32Array(gMemory.buffer, ptr, newLen), ptr, newLen);
    if(_mgr["_insBuf"]!=null)
        newBuf.set((_mgr["_insBuf"] as Float32Array).subarray(0,(_mgr["_insCount"]||0)*OCT_INSERT_STRIDE));
    _mgr["_insBuf"]=newBuf;
    _mgr["_insCap"]=newCap;
    if(gOctInsOwners.indexOf(_mgr)<0)
        gOctInsOwners.push(_mgr);
}

function gjkBufEnsure(_minFloats: number): Float32Array
{
    checkMemoryGrow();
    const curLen=gGjkBuf!=null?(gGjkBuf["len"]??gGjkBuf.length):0;
    if(gGjkBuf!=null && curLen>=_minFloats)  return gGjkBuf;

    const newLen=Math.max(_minFloats, curLen>0?curLen*2:4096);
    const ptr=allocRaw(newLen*4);
    gGjkBuf=markView(new Float32Array(gMemory.buffer, ptr, newLen), ptr, newLen);
    return gGjkBuf;
}
function gjkPackShape(_buf: Float32Array, _off: number, _shape: any): number
{
    const type=_shape.mBound.GetType();
    _buf[_off+0]=type;
    const mat=_shape.mMat.mF32A, imat=_shape.mIMat.mF32A;
    for(let i=0;i<16;++i)   _buf[_off+1+i]=mat[i];
    for(let i=0;i<16;++i)   _buf[_off+17+i]=imat[i];
    _buf[_off+33]=_shape.mWBound.mMin.mF32A[0]; _buf[_off+34]=_shape.mWBound.mMin.mF32A[1]; _buf[_off+35]=_shape.mWBound.mMin.mF32A[2];
    _buf[_off+36]=_shape.mWBound.mMax.mF32A[0]; _buf[_off+37]=_shape.mWBound.mMax.mF32A[1]; _buf[_off+38]=_shape.mWBound.mMax.mF32A[2];
    _buf[_off+39]=_shape.mRadian;

    let vertCount=0;
    if(type==2)
    {
        vertCount=_shape.mBound.mPos.Size();
        _buf[_off+40]=vertCount;
        for(let i=0;i<vertCount;++i)
        {
            const v=_shape.mBound.mPos.Find(i).mF32A;
            _buf[_off+41+i*3]=v[0]; _buf[_off+41+i*3+1]=v[1]; _buf[_off+41+i*3+2]=v[2];
        }
    }
    else
        _buf[_off+40]=0;

    return _off+41+vertCount*3;
}
function gjkPackPair(_shapeA: any, _shapeB: any): {ptrA: number, ptrB: number}
{
    const vcA=_shapeA.mBound.GetType()==2?_shapeA.mBound.mPos.Size():0;
    const vcB=_shapeB.mBound.GetType()==2?_shapeB.mBound.mPos.Size():0;
    const need=(41+vcA*3)+(41+vcB*3);
    const buf=gjkBufEnsure(need);
    const offA=0;
    const offB=gjkPackShape(buf,offA,_shapeA);
    gjkPackShape(buf,offB,_shapeB);
    const base=(buf as any)["ptr"];
    return { ptrA: base+offA*4, ptrB: base+offB*4 };
}
function gjkResultBuf(): Float32Array
{
    checkMemoryGrow();
    if(gGjkResultBuf==null)
    {
        const ptr=allocRaw(3*4);
        gGjkResultBuf=markView(new Float32Array(gMemory.buffer, ptr, 3), ptr, 3);
    }
    return gGjkResultBuf;
}

function liftDecodeString(pointer: number): string {
    if (!pointer) return "";
    const memoryU32 = new Uint32Array(gMemory.buffer);
    const memoryU16 = new Uint16Array(gMemory.buffer);
    const start = pointer >>> 1;
    const end = start + (memoryU32[(pointer - 4) >>> 2] >>> 1);
    return String.fromCharCode(...memoryU16.subarray(start, end));
}

const RES_TAG_A: string = "952465336_3546857140";
const RES_TAG_B: string = "3347165939_1147473823";

const gArtgineBytesCache = new Map<string, ArrayBuffer | Uint8Array>();

export class CWASM
{
    static async LoadArtgineBytes(_relPath: string): Promise<ArrayBuffer | Uint8Array> {
        const cached = gArtgineBytesCache.get(_relPath);
        if (cached != null) return cached;

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

    // LoadArtgineBytes와 달리 동기(async 아님) — gArtgineBytesCache에 이미 있는 바이트만 돌려준다.
    // loadSingleton()이 인스턴스화 과정에서 이 캐시를 먼저 채워두므로(wasm export가 하나라도
    // 호출 가능해지려면 인스턴스화가 끝나야 함), ASM_MAIN 최초 진입 시점엔 항상 캐시가 채워져
    // 있다. 캐시 미스(0)는 정상 경로에서는 절대 발생하지 않아야 하는 상황이라 fail-safe로 둔다.
    // wasmNew 헤더 관례(ptr-4=byteLength)로 반환하므로 AS 쪽은 별도 길이 인자 없이 load<u32>(ptr-4)로 읽는다.
    static GetArtgineBytesSyncPtr(_relPath: string): number {
        const cached = gArtgineBytesCache.get(_relPath);
        if (cached == null) return 0;
        const u8 = cached instanceof Uint8Array ? cached : new Uint8Array(cached as ArrayBuffer);
        if (u8.byteLength === 0) return 0;
        const ptr = wasmNew(u8.byteLength);
        new Uint8Array(gMemory.buffer, ptr, u8.byteLength).set(u8);
        return ptr;
    }

    // raw fact only(판단 없음) — Electron이면 버전 문자열, 아니면 "".
    static GetElectronInfo(): string {
        const isElectron = typeof process !== "undefined" && !!(process as any).versions
            && (process as any).versions.electron != null;
        return isElectron ? String((process as any).versions.electron) : "";
    }

    // raw fact only — Node면 "node|<platform>|<version>", 브라우저면 "browser|<userAgent>".
    // 접두사(node|, browser|)만 판단(AS)이 프로토콜처럼 참조하고, 나머지는 참고용 원본 정보.
    static GetPlatformInfo(): string {
        if (CUtil.IsNode() && typeof process !== "undefined") {
            return `node|${process.platform}|${process.version}`;
        }
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        return `browser|${ua}`;
    }

    // raw fact only — 지금 이 순간의 Error().stack 원문 그대로.
    static GetStackInfo(): string {
        return new Error().stack || "";
    }

    // raw fact only — process.execArgv 원문 그대로(Node 아니면 "").
    static GetExecArgvInfo(): string {
        return (typeof process !== "undefined" && (process as any).execArgv)
            ? (process as any).execArgv.join(" ")
            : "";
    }

    static GetResourcePath(): string {
        return "artgine/wasm/" + (gIsSimd ? "ASM_SIMD.wasm" : "ASM.wasm");
    }

    static GetResourceTag(): string {
        return gIsSimd ? RES_TAG_B : RES_TAG_A;
    }

    static JSMode(): boolean
    {
        return false;
    }

    static SetThread(_enable)
    {
        gThread=_enable;
    }
    static GetThread()  {   return gThread;    }

    static IsSIMD()
    {
        return gIsSimd;
    }
    static Malloc(_size)
    {
        return allocRaw(_size);
    }

    static Free(_ptr : number)
    {
        if(gInstance==null || _ptr==null)  return;
        (gInstance.exports.__unpin as (ptr:number)=>void)(_ptr);
    }

    static NewI32A(_size) : Int32Array
    {
        if(CWASM.IsSIMD()==false)
        {
            return new Int32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=allocRaw(numBytes);
        return markView(new Int32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }
    static NewU32A(_size) : Uint32Array
    {
        if(CWASM.IsSIMD()==false)
        {
            return new Uint32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=allocRaw(numBytes);
        return markView(new Uint32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }

    static NewF32A(_size) : Float32Array
    {
        if(CWASM.IsSIMD()==false)
        {
            return new Float32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=allocRaw(numBytes);
        return markView(new Float32Array(gMemory.buffer, ptr, _size), ptr, _size);
    }
    static RegisterF32A(_owner: IWasmF32Owner)
    {
        if(_owner==null)  return;
        if(gF32Owners.indexOf(_owner)<0)
            gF32Owners.push(_owner);
    }
    static UnregisterF32A(_owner: IWasmF32Owner)
    {
        if(_owner==null)  return;
        const i=gF32Owners.indexOf(_owner);
        if(i<0)  return;
        gF32Owners[i]=gF32Owners[gF32Owners.length-1];
        gF32Owners.pop();
    }
    static ProductF32A(_count)
    {
        checkMemoryGrow();
        let F32A=g_F32A2.Pop();
        if(F32A==null)
            F32A=CWASM.NewF32A(_count);
        else
            F32A=rebaseF32(F32A);
        for(let i=0;i<_count;++i)
            F32A[i]=0;
        return F32A;
    }
    static Recycle(_F32A : Float32Array)
    {
        if(_F32A==null || _F32A["ptr"]==null)  return;
        checkMemoryGrow();
        _F32A=rebaseF32(_F32A);

        const bytes=(_F32A["len"]!=null?_F32A["len"]*4:_F32A.byteLength);
        switch(bytes)
        {
            case 8:     g_F32A2.Push(_F32A);    break;
            case 12:    g_F32A3.Push(_F32A);    break;
            case 16:    g_F32A4.Push(_F32A);    break;
            case 64:    g_F32A16.Push(_F32A);    break;
            case 96:    g_F32A24.Push(_F32A);    break;
            default:

                
                break;
        }

    }

    static PlaneSphereInside(_planePtr : number,_posPtr : number,_radius : number)
    {
        return (gInstance.exports.PlaneSphereInside as (a:number,b:number,c:number)=>number)(_planePtr,_posPtr,_radius);
    }
    static V3Distance(_a : number,_b : number) : number
    {
        return (gInstance.exports.V3Distance as (a:number,b:number)=>number)(_a,_b);
    }

    static BoundMulMat(_tminPtr : number,_tmaxPtr  : number,_ominPtr  : number,_omaxPtr  : number,_matPtr  : number,_center  : number) : number
    {
        return (gInstance.exports.BoundMulMat as (a:number,b:number,c:number,d:number,e:number,f:number)=>number)(_tminPtr,_tmaxPtr,_ominPtr,_omaxPtr,_matPtr,_center);
    }
    static MatMemcpy(_a : number,_b : number)
    {
        (gInstance.exports.MatMemcpy as (a:number,b:number)=>void)(_a,_b);
    }
    static MatMul(_a : number,_b : number,_dst : number)
    {
        (gInstance.exports.MatMul as (a:number,b:number,c:number)=>void)(_a,_b,_dst);
    }
    static MatInvert(_src : number,_dst : number)
    {
        (gInstance.exports.MatInvert as (a:number,b:number)=>void)(_src,_dst);
    }

    static readonly FN_CSubject_RouteMsg = 0;
    static readonly FN_CSubject_RootMsgUpdate = 1;
    static readonly FN_CSubject_RouteMsgUpdate = 2;
    static readonly FN_CSubject_MatUpdate = 3;

    static CSubject_RouteMsg(_subject: any, _msg: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CSubject_RouteMsg,_subject,_msg);
        checkMemoryGrow();
    }
    static CSubject_RootMsgUpdate(_subject: any, _update: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CSubject_RootMsgUpdate,_subject,_update);
        checkMemoryGrow();
    }
    static CSubject_RouteMsgUpdate(_subject: any, _update: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CSubject_RouteMsgUpdate,_subject,_update);
        checkMemoryGrow();
    }
    static CSubject_MatUpdate(_subject: any, _rsUpdate: boolean): void
    {
        (gInstance.exports.ASM_LINK_ON as (fn:number,a:any,b:number)=>void)(CWASM.FN_CSubject_MatUpdate,_subject,_rsUpdate?1:0);
        checkMemoryGrow();
    }

    static readonly FN_CVoxelMap_PlaneRefresh = 12;
    static readonly FN_CVoxelMap_RefreshRes = 13;
    static readonly FN_CVoxelMap_PickBox = 14;

    static CVoxelMap_PlaneRefresh(_voxel: any, _index: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CVoxelMap_PlaneRefresh,_voxel,_index);
        checkMemoryGrow();
    }
    static CVoxelMap_RefreshRes(_voxel: any): void
    {
        (gInstance.exports.ASM_LINK_O as (fn:number,a:any)=>void)(CWASM.FN_CVoxelMap_RefreshRes,_voxel);
        checkMemoryGrow();
    }
    static CVoxelMap_PickBox(_voxel: any, _ray: any): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CVoxelMap_PickBox,_voxel,_ray));
    }

    // wire 153~155(진짜1+디코이2) — 다른 도메인 wire(0~152)와 안 겹치게 뒤에 이어붙였다.
    // 디코이(154/155)는 CVoxelMap 디코이와 같은 관례로 JS에서 직접 호출하지 않는다(export 없음) —
    // ASM_MAIN 내부에서 검증 실패 시 스크램블 dispatch로만 도달 가능.
    static readonly FN_CCanvas_Update = 153;

    static CCanvas_Update(_canvas: any, _update: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CCanvas_Update,_canvas,_update);
        checkMemoryGrow();
    }

    static readonly FN_CObject_EditChange = 21;
    static readonly FN_CObject_ImportCJSON = 22;
    static readonly FN_CObject_ExportJSON = 23;

    static CObject_EditChange(_obj: any, _pointer: any, _child: boolean): void
    {
        (gInstance.exports.ASM_LINK_OON as (fn:number,a:any,b:any,c:number)=>void)(CWASM.FN_CObject_EditChange,_obj,_pointer,_child?1:0);
        checkMemoryGrow();
    }
    static CObject_ImportCJSON(_obj: any, _json: any): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CObject_ImportCJSON,_obj,_json));
    }
    static CObject_ExportJSON(_obj: any): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_O_RO as (fn:number,a:any)=>any)(CWASM.FN_CObject_ExportJSON,_obj));
    }

    static readonly FN_CObject_Export = 44;
    static readonly FN_CObject_Import = 45;

    static CObject_Export(_obj: any, _copy: boolean, _resetKey: boolean): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_ONN_RO as (fn:number,a:any,b:number,c:number)=>any)(CWASM.FN_CObject_Export,_obj,_copy?1:0,_resetKey?1:0));
    }
    static CObject_Import(_tar: any, _org: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CObject_Import,_tar,_org);
        checkMemoryGrow();
    }

    static readonly FN_Octree_New = 50;
    static readonly FN_Octree_Delete = 51;
    static readonly FN_Octree_Build = 52;
    static readonly FN_Octree_InsertBatch = 54;
    static readonly FN_Octree_InsideRay = 55;
    static readonly FN_Octree_InsideBox = 56;
    static readonly FN_Octree_InsidePlane = 57;

    static COctreeMgr_New(): number
    {
        return afterWasm((gInstance.exports.ASM_LINK_OCT_NEW_RO as (fn:number)=>number)(CWASM.FN_Octree_New));
    }
    static COctreeMgr_Insert(_mgr: any, _dataId: number,
        _cx: number,_cy: number,_cz: number, _sx: number,_sy: number,_sz: number,
        _hasMinMax: boolean, _minx: number,_miny: number,_minz: number, _maxx: number,_maxy: number,_maxz: number,
        _isStatic: boolean): void
    {
        const count=_mgr["_insCount"]||0;
        octInsertBufEnsure(_mgr, count+1);
        const buf=_mgr["_insBuf"] as Float32Array;
        const o=count*OCT_INSERT_STRIDE;
        buf[o+0]=_dataId;
        buf[o+1]=_cx; buf[o+2]=_cy; buf[o+3]=_cz;
        buf[o+4]=_sx; buf[o+5]=_sy; buf[o+6]=_sz;
        buf[o+7]=_hasMinMax?1:0;
        buf[o+8]=_minx; buf[o+9]=_miny; buf[o+10]=_minz;
        buf[o+11]=_maxx; buf[o+12]=_maxy; buf[o+13]=_maxz;
        buf[o+14]=_isStatic?1:0;
        _mgr["_insCount"]=count+1;
    }
    static COctreeMgr_Build(_handle: number, _mgr: any, _forceStaticUpdate: boolean): void
    {
        const octN=gInstance.exports.ASM_LINK_OCT_N as (fn:number,
            n0:number,n1:number,n2:number,n3:number,n4:number,n5:number,n6:number,n7:number,
            n8:number,n9:number,n10:number,n11:number,n12:number,n13:number,n14:number,n15:number)=>void;
        const count=_mgr["_insCount"]||0;
        if(count>0)
        {
            octN(CWASM.FN_Octree_InsertBatch,
                _handle,(_mgr["_insBuf"] as Float32Array)["ptr"],count,0,0,0,0,0,0,0,0,0,0,0,0,0);
            _mgr["_insCount"]=0;
        }
        octN(CWASM.FN_Octree_Build,_handle,_forceStaticUpdate?1:0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
        checkMemoryGrow();
    }
    static COctreeMgr_InsideRay(_handle: number, _ox: number,_oy: number,_oz: number,
        _dx: number,_dy: number,_dz: number, _rayLength: number,_boundary: number): Array<number>
    {
        const buf=octResultBuf();
        (gInstance.exports.ASM_LINK_OCT_N as (fn:number,
            n0:number,n1:number,n2:number,n3:number,n4:number,n5:number,n6:number,n7:number,
            n8:number,n9:number,n10:number,n11:number,n12:number,n13:number,n14:number,n15:number)=>void)
            (CWASM.FN_Octree_InsideRay,
                _handle,_ox,_oy,_oz,_dx,_dy,_dz,_rayLength,_boundary,buf["ptr"],OCT_RESULT_CAP,0,0,0,0,0);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }
    static COctreeMgr_InsideBox(_handle: number, _minx: number,_miny: number,_minz: number,
        _maxx: number,_maxy: number,_maxz: number, _excludeId: number): Array<number>
    {
        const buf=octResultBuf();
        (gInstance.exports.ASM_LINK_OCT_N as (fn:number,
            n0:number,n1:number,n2:number,n3:number,n4:number,n5:number,n6:number,n7:number,
            n8:number,n9:number,n10:number,n11:number,n12:number,n13:number,n14:number,n15:number)=>void)
            (CWASM.FN_Octree_InsideBox,
                _handle,_minx,_miny,_minz,_maxx,_maxy,_maxz,_excludeId,buf["ptr"],OCT_RESULT_CAP,0,0,0,0,0,0);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }
    static COctreeMgr_InsidePlane(_handle: number, _bplane: any): Array<number>
    {
        const buf=octResultBuf();
        (gInstance.exports.ASM_LINK_OCT_PLANE as (fn:number,handle:number,bplane:any,resultPtr:number,capacity:number)=>void)
            (CWASM.FN_Octree_InsidePlane,_handle,_bplane,buf["ptr"],OCT_RESULT_CAP);
        checkMemoryGrow();
        return octReadResults(gOctResultBuf);
    }

    static readonly FN_GJK_New = 74;
    static readonly FN_GJK_Delete = 75;
    static readonly FN_GJK_Intersect = 76;
    static readonly FN_GJK_EPA = 77;

    static GJK_New(): number
    {
        return afterWasm((gInstance.exports.ASM_LINK_OCT_NEW_RO as (fn:number)=>number)(CWASM.FN_GJK_New));
    }
    static GJK_Delete(_handle: number): void
    {
        (gInstance.exports.ASM_LINK_GJK_N4_RO as (fn:number,n0:number,n1:number,n2:number,n3:number)=>number)
            (CWASM.FN_GJK_Delete,_handle,0,0,0);
        checkMemoryGrow();
    }
    static GJK_Intersect(_handle: number, _shapeA: any, _shapeB: any): boolean
    {
        const {ptrA,ptrB}=gjkPackPair(_shapeA,_shapeB);
        const r=(gInstance.exports.ASM_LINK_GJK_N4_RO as (fn:number,n0:number,n1:number,n2:number,n3:number)=>number)
            (CWASM.FN_GJK_Intersect,_handle,ptrA,ptrB,0);
        checkMemoryGrow();
        return r!=0;
    }
    static GJK_EPA(_handle: number, _shapeA: any, _shapeB: any): [number,number,number]
    {
        const {ptrA,ptrB}=gjkPackPair(_shapeA,_shapeB);
        const buf=gjkResultBuf();
        (gInstance.exports.ASM_LINK_GJK_N4_RO as (fn:number,n0:number,n1:number,n2:number,n3:number)=>number)
            (CWASM.FN_GJK_EPA,_handle,ptrA,ptrB,buf["ptr"]);
        checkMemoryGrow();
        return [gGjkResultBuf[0],gGjkResultBuf[1],gGjkResultBuf[2]];
    }

    static readonly FN_CShaderInterpret_VFPasing = 78;

    static CShaderInterpret_VFPasing(_str: string, _vfCountArr: any, _vf: any): any
    {
        const byteLength=_str.length*2;
        const ptr=wasmNew(byteLength);
        const buf=new Uint16Array(gMemory.buffer, ptr, _str.length);
        for(let i=0;i<_str.length;i++)  buf[i]=_str.charCodeAt(i);
        return afterWasm((gInstance.exports.ASM_LINK_S_OO_RO as (fn:number,strPtr:number,a:any,b:any)=>any)
            (CWASM.FN_CShaderInterpret_VFPasing,ptr,_vfCountArr,_vf));
    }

    static readonly FN_CShaderInterpret_Emit = 81;

    static CShaderInterpret_Emit(_self: any, _ir: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CShaderInterpret_Emit,_self,_ir);
        checkMemoryGrow();
    }

    static readonly FN_CShaderInterpret_EmitStmts = 84;

    static CShaderInterpret_EmitStmts(_self: any, _arr: any): string
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_EmitStmts,_self,_arr));
    }

    static readonly FN_CShaderInterpret_EmitExpr = 87;

    static CShaderInterpret_EmitExpr(_self: any, _e: any): string
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_EmitExpr,_self,_e));
    }

    static readonly FN_CShaderInterpret_BuildVSUni = 90;

    static CShaderInterpret_BuildVSUni(_self: any, _shader: any, _in: any): string
    {
        const pack=[_shader,_in];
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_BuildVSUni,_self,pack));
    }

    static readonly FN_CShaderInterpret_EmitCastGPU = 93;

    static CShaderInterpretGPU_EmitCast(_self: any, _e: any, _want: string): string
    {
        const byteLength=_want.length*2;
        const ptr=wasmNew(byteLength);
        const buf=new Uint16Array(gMemory.buffer, ptr, _want.length);
        for(let i=0;i<_want.length;i++)  buf[i]=_want.charCodeAt(i);
        return afterWasm((gInstance.exports.ASM_LINK_S_OO_RO as (fn:number,strPtr:number,a:any,b:any)=>any)
            (CWASM.FN_CShaderInterpret_EmitCastGPU,ptr,_self,_e));
    }

    static readonly FN_CShaderInterpret_EmitExprGPU = 96;

    static CShaderInterpretGPU_EmitExpr(_self: any, _e: any): string
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_EmitExprGPU,_self,_e));
    }

    static readonly FN_CShaderInterpret_EmitStmtsGPU = 99;

    static CShaderInterpretGPU_EmitStmts(_self: any, _arr: any): string
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_EmitStmtsGPU,_self,_arr));
    }

    static readonly FN_CShaderInterpret_BuildVSUniGPU = 102;

    static CShaderInterpretGPU_BuildVSUni(_self: any, _shader: any, _in: any, _compute: boolean): string
    {
        const pack=[_shader,_in,_compute];
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CShaderInterpret_BuildVSUniGPU,_self,pack));
    }

    static readonly FN_CMeshTreeUpdate_TreeCopy = 105;
    static readonly FN_CMeshTreeUpdate_TreeReset = 106;
    static readonly FN_CMeshTreeUpdate_TreeUpdateMeshAni = 107;
    static readonly FN_CMeshTreeUpdate_TreeMeshInter = 108;

    static CMeshTreeUpdate_TreeCopy(_md: any, _mci: any, _sum: any, _bound: any): void
    {
        const pack=[_md,_mci,_sum,_bound];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CMeshTreeUpdate_TreeCopy,pack,null);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeReset(_md: any, _mci: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CMeshTreeUpdate_TreeReset,_md,_mci);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeUpdateMeshAni(_pst: number, _st: number, _ed: number, _pmd: any, _amd: any, _mci: any, _all: any): void
    {
        const pack=[_pst,_st,_ed,_pmd,_amd,_mci,_all];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CMeshTreeUpdate_TreeUpdateMeshAni,pack,null);
        checkMemoryGrow();
    }
    static CMeshTreeUpdate_TreeMeshInter(_mci: any, _create: boolean): void
    {
        const pack=[_mci,_create];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CMeshTreeUpdate_TreeMeshInter,pack,null);
        checkMemoryGrow();
    }

    static readonly FN_CRenderer_ReleaseTexture = 117;
    static readonly FN_CRenderer_ReleaseMeshDrawNode = 118;

    static CRenderer_ReleaseTexture(_self: any, _tex: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_ReleaseTexture,_self,_tex);
        checkMemoryGrow();
    }
    static CRenderer_ReleaseMeshDrawNode(_self: any, _mesh: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_ReleaseMeshDrawNode,_self,_mesh);
        checkMemoryGrow();
    }

    static readonly FN_CRenderer_BuildRenderTarget = 123;

    static CRenderer_BuildRenderTarget(_self: any, _info: any, _size: any, _key: any): string
    {
        const pack=[_info,_size,_key];
        const r=(gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CRenderer_BuildRenderTarget,_self,pack);
        checkMemoryGrow();
        return r;
    }

    static readonly FN_CRenderer_BuildCubeMap = 126;

    static CRenderer_BuildCubeMap(_self: any, _texList: any, _mipmap: boolean, _key: any): string
    {
        const pack=[_texList,_mipmap,_key];
        const r=(gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CRenderer_BuildCubeMap,_self,pack);
        checkMemoryGrow();
        return r;
    }

    static readonly FN_CRenderer_BuildTexture = 129;

    static CRenderer_BuildTexture(_self: any, _tex: any, _ch5canvas: any): Promise<void>
    {
        const pack=[_tex,_ch5canvas];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_BuildTexture,_self,pack);
        checkMemoryGrow();
        return Promise.resolve();
    }

    static readonly FN_CRenderer_BuildMeshDrawNode = 132;

    static CRenderer_BuildMeshDrawNode(_self: any, _mesh: any, _info: any, _vf: any): void
    {
        const pack=[_mesh,_info,_vf];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_BuildMeshDrawNode,_self,pack);
        checkMemoryGrow();
    }

    static readonly FN_CRenderer_BuildMeshAutoFix = 135;

    static CRenderer_BuildMeshAutoFix(_self: any, _mesh: any, _drawTree: any, _vf: any): void
    {
        const pack=[_mesh,_drawTree,_vf];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_BuildMeshAutoFix,_self,pack);
        checkMemoryGrow();
    }

    static readonly FN_CRenderer_BuildMeshDrawNodeAutoFix = 138;

    static CRenderer_BuildMeshDrawNodeAutoFix(_self: any, _meshDraw: any, _vf: any, _info: any): void
    {
        const pack=[_meshDraw,_vf,_info];
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRenderer_BuildMeshDrawNodeAutoFix,_self,pack);
        checkMemoryGrow();
    }

    static readonly FN_CRendererGPU_ReleaseTexture = 141;

    static CRendererGPU_ReleaseTexture(_self: any, _tex: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRendererGPU_ReleaseTexture,_self,_tex);
        checkMemoryGrow();
    }

    static readonly FN_CRendererGPU_ReleaseMeshDrawNode = 144;

    static CRendererGPU_ReleaseMeshDrawNode(_self: any, _mesh: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CRendererGPU_ReleaseMeshDrawNode,_self,_mesh);
        checkMemoryGrow();
    }

    static readonly FN_CRendererGPU_BuildRenderTarget = 147;

    static CRendererGPU_BuildRenderTarget(_self: any, _info: any, _size: any, _key: any): string
    {
        const pack=[_info,_size,_key];
        const r=(gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CRendererGPU_BuildRenderTarget,_self,pack);
        checkMemoryGrow();
        return r;
    }

    static readonly FN_CRendererGPU_BuildCubeMap = 150;

    static CRendererGPU_BuildCubeMap(_self: any, _texList: any, _mipmap: boolean, _key: any): string
    {
        const pack=[_texList,_mipmap,_key,(globalThis as any).GPUTextureUsage];
        const r=(gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CRendererGPU_BuildCubeMap,_self,pack);
        checkMemoryGrow();
        return r;
    }

    static readonly FN_CStream_Push = 30;
    static readonly FN_CStream_NextValue = 31;
    static readonly FN_CStream_GetValue = 34;
    static readonly FN_CStream_GetMember = 35;
    static readonly FN_CStream_GetArray = 36;
    static readonly FN_CStream_GetSet = 37;
    static readonly FN_CStream_GetMap = 38;

    static CStream_Push(_obj: any, _val: any): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_OO_RO as (fn:number,a:any,b:any)=>any)(CWASM.FN_CStream_Push,_obj,_val));
    }
    static CStream_NextValue(_obj: any, _value: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CStream_NextValue,_obj,_value);
        checkMemoryGrow();
    }
    static CStream_GetValue(_obj: any): any
    {
        return afterWasm((gInstance.exports.ASM_LINK_O_RO as (fn:number,a:any)=>any)(CWASM.FN_CStream_GetValue,_obj));
    }
    static CStream_GetMember(_obj: any, _val: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CStream_GetMember,_obj,_val);
        checkMemoryGrow();
    }
    static CStream_GetArray(_obj: any, _array: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CStream_GetArray,_obj,_array);
        checkMemoryGrow();
    }
    static CStream_GetSet(_obj: any, _set: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CStream_GetSet,_obj,_set);
        checkMemoryGrow();
    }
    static CStream_GetMap(_obj: any, _map: any): void
    {
        (gInstance.exports.ASM_LINK_OO as (fn:number,a:any,b:any)=>void)(CWASM.FN_CStream_GetMap,_obj,_map);
        checkMemoryGrow();
    }

    static Decode(_stack: string, _encoded: string, _indexOffset: number = 0): string {
        if (gInstance == null) return "";

        const encoder = new TextEncoder();
        const stackBytes = encoder.encode(_stack);
        const encodedBytes = encoder.encode(_encoded);

        const exports = gInstance.exports as any;
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
