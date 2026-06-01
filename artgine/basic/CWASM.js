import { CArray } from "./CArray.js";
import { CPath } from "./CPath.js";
import { CUtil } from "./CUtil.js";
var g_F32A2 = new CArray();
var g_F32A3 = new CArray();
var g_F32A4 = new CArray();
var g_F32A16 = new CArray();
var g_F32A24 = new CArray();
var gWASM = null;
var gThread = true;
var gSimd = false;
var gDummy;
var gReadyResolve = null;
var gReadyPromise = new Promise((resolve) => {
    gReadyResolve = resolve;
});
async function LoadWasmFactory(_useSimd) {
    if (_useSimd) {
        const m = await import("../wasm/WASM_SIMD.js");
        return (m.default ?? m);
    }
    else {
        const m = await import("../wasm/WASM_NoSIMD.js");
        return (m.default ?? m);
    }
}
export class CWASM {
    static Obfuscation() {
    }
    static SetThread(_enable) {
        gThread = _enable;
    }
    static GetThread() { return gThread; }
    static async Init(_simd, _path) {
        if (_simd) {
            if (typeof WebAssembly === "object" && typeof WebAssembly.FeatureDetect === "function") {
                gSimd = await WebAssembly.FeatureDetect("simd");
            }
            else if (WebAssembly && WebAssembly.validate) {
                try {
                    await WebAssembly.compileStreaming(fetch(CPath.PHPC() + "artgine/wasm/WASM_SIMD.wasm"));
                    gSimd = true;
                }
                catch (e) {
                    console.log("SIMD 미지원");
                }
            }
        }
        if (gWASM == null) {
            if (CUtil.IsNode()) {
                gReadyResolve();
                return;
            }
            gWASM = {};
            const factory = await LoadWasmFactory(gSimd);
            await factory(gWASM);
            const encoder = new TextEncoder();
            const encoded = encoder.encode(_path);
            let ptr = gWASM._malloc(encoded.length + 1);
            gWASM.HEAPU8.set(encoded, ptr);
            gWASM.HEAPU8[ptr + encoded.length] = 0;
            gWASM._Init(ptr);
            gWASM._free(ptr);
            gDummy = gWASM._malloc(4);
            gReadyResolve();
        }
    }
    static IsWASM() {
        return gWASM != null && gSimd;
    }
    static Malloc(_size) {
        return gWASM._malloc(_size);
    }
    static Free() { }
    static NewI32A(_size) {
        if (CWASM.IsWASM() == false) {
            return new Int32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = gWASM._malloc(numBytes);
        var heapBytes = gWASM.HEAP32.subarray(ptr / 4, ptr / 4 + (numBytes / 4));
        heapBytes.ptr = ptr;
        return heapBytes;
    }
    static NewU32A(_size) {
        if (CWASM.IsWASM() == false) {
            return new Uint32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = gWASM._malloc(numBytes);
        var heapBytes = gWASM.HEAPU32.subarray(ptr / 4, ptr / 4 + (numBytes / 4));
        heapBytes.ptr = ptr;
        return heapBytes;
    }
    static NewF32A(_size) {
        if (CWASM.IsWASM() == false) {
            return new Float32Array(_size);
        }
        var numBytes = _size * 4;
        var ptr = gWASM._malloc(numBytes);
        var heapBytes = gWASM.HEAPF32.subarray(ptr / 4, ptr / 4 + (numBytes / 4));
        heapBytes.ptr = ptr;
        return heapBytes;
    }
    static ProductF32A(_count) {
        let F32A = g_F32A2.Pop();
        if (F32A == null)
            F32A = CWASM.NewF32A(_count);
        for (let i = 0; i < _count; ++i)
            F32A[i] = 0;
        return F32A;
    }
    static Recycle(_F32A) {
        if (_F32A["ptr"] == null)
            return;
        switch (_F32A.byteLength) {
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
                console.log("f32a error");
                break;
        }
    }
    static PlaneSphereInside(_planePtr, _posPtr, _radius) {
        return gWASM._PlaneSphereInside(_planePtr, _posPtr, _radius);
    }
    static V3Distance(_a, _b) {
        return gWASM._V3Distance(_a, _b);
    }
    static BoundMulMat(_tminPtr, _tmaxPtr, _ominPtr, _omaxPtr, _matPtr, _center) {
        return gWASM._BoundMulMat(_tminPtr, _tmaxPtr, _ominPtr, _omaxPtr, _matPtr, _center);
    }
    static MatMemcpy(_a, _b) {
        gWASM._MatMemcpy(_a, _b);
    }
    static MatMul(_a, _b, _dst) {
        gWASM._MatMul(_a, _b, _dst);
    }
    static MatInvert(_src, _dst) {
        gWASM._MatInvert(_src, _dst);
    }
    static Checker(_data) {
        gWASM.HEAPU32[gDummy / 4] = _data;
        gWASM.HEAPU8[gDummy + 4] = 0;
        return gWASM._Checker(gDummy);
    }
    static SourceExcute(_filename, _encoded) {
        const BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const ALEN = 62, KLEN = 16;
        let h = 0x811c9dc5;
        for (let i = 0; i < _filename.length; i++) {
            h ^= _filename.charCodeAt(i);
            h = (h * 0x01000193) >>> 0;
        }
        const arr = BASE.split('');
        let seed = h;
        for (let i = ALEN - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const j = seed % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const alph = arr.join('');
        let xorKey = '';
        for (let i = 0; i < KLEN; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            xorKey += alph[seed % ALEN];
        }
        let r = '';
        for (let i = 0; i < _encoded.length; i += 2) {
            const b = alph.indexOf(_encoded[i]) * 62 + alph.indexOf(_encoded[i + 1]);
            r += String.fromCharCode(b ^ xorKey.charCodeAt((i / 2) % KLEN));
        }
        return r;
    }
}
