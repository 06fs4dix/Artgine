import SIMDModule from "../wasm/WASM_SIMD.js";
import NoSIMDModule from "../wasm/WASM_NoSIMD.js";
import { CAlert } from "./CAlert.js";
import { CArray } from "./CArray.js";
import { CPath } from "./CPath.js";
var g_F32A2 = new CArray();
var g_F32A3 = new CArray();
var g_F32A4 = new CArray();
var g_F32A16 = new CArray();
var g_F32A24 = new CArray();
var gWASM = null;
var gThread = true;
var gSimd = false;
var gDummy;
export class CWASM {
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
            gWASM = {};
            if (gSimd)
                await SIMDModule(gWASM);
            else
                await NoSIMDModule(gWASM);
            const encoder = new TextEncoder();
            const encoded = encoder.encode(_path);
            let ptr = gWASM._malloc(encoded.length + 1);
            gWASM.HEAPU8.set(encoded, ptr);
            gWASM.HEAPU8[ptr + encoded.length] = 0;
            gWASM._Init(ptr);
            gWASM._free(ptr);
            gDummy = gWASM._malloc(4);
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
                CAlert.E("f32a error");
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
}
