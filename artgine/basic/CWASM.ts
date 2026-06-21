//import {CAlert} from "./CAlert.js";
import {CArray} from "./CArray.js";
import { CPath } from "./CPath.js";
import { CUtil } from "./CUtil.js";

var g_F32A2=new CArray<Float32Array>();
var g_F32A3=new CArray<Float32Array>();
var g_F32A4=new CArray<Float32Array>();
var g_F32A16=new CArray<Float32Array>();
var g_F32A24=new CArray<Float32Array>();

var gWASM=null;
var gThread=true;
var gSimd=false;
var gDummy : any;


type EmscriptenFactory = (module: any) => Promise<any> | any;
var gReadyResolve: () => void = null;
var gReadyPromise: Promise<void> = new Promise<void>((resolve) => {
    gReadyResolve = resolve;
});

async function LoadWasmFactory(_useSimd: boolean): Promise<EmscriptenFactory> {
  if (_useSimd) {
    const m: any = await import("../wasm/WASM_SIMD.js");
    return (m.default ?? m) as EmscriptenFactory;
  } else {
    const m: any = await import("../wasm/WASM_NoSIMD.js");
    return (m.default ?? m) as EmscriptenFactory;
  }
}


export class CWASM
{
    static Obfuscation()
    {
        
    }
    static SetThread(_enable)
    {
        gThread=_enable;
    }
    static GetThread()  {   return gThread;    }
    static async Init(_simd : boolean,_path : string)
    {
        //if(CUtil.IsNode())  return;
        if(_simd)
        {
            if (typeof WebAssembly === "object" && typeof WebAssembly.FeatureDetect === "function") 
            {
                gSimd=await WebAssembly.FeatureDetect("simd");

            }
            else if (WebAssembly && WebAssembly.validate) 
            {
                try {
                    await WebAssembly.compileStreaming(fetch(CPath.WebRootArtgineUrl()+"artgine/wasm/WASM_SIMD.wasm"));
                    gSimd=true;
                } catch (e) {
                    console.log("SIMD 미지원");
                }
            }
        }
        
        if(gWASM==null)
        {
            if (CUtil.IsNode()) {
                gReadyResolve();  // ← 추가
                return;
                // const xhr2 = await import('xhr2');
                // (globalThis as any).XMLHttpRequest = xhr2.default ?? xhr2;
            }

            gWASM={};
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
            gReadyResolve();  // ← 추가
        }
    }
    static IsWASM()
    {
        return gWASM!=null && gSimd;
    }
    static Malloc(_size)    
    {
        return gWASM._malloc(_size);
    }

    static Free(){}
 
    static NewI32A(_size) : Int32Array
    {
        if(CWASM.IsWASM()==false)
        {
            return new Int32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=gWASM._malloc(numBytes);
        var heapBytes=gWASM.HEAP32.subarray(ptr/4, ptr/4+(numBytes/4));
       
        heapBytes.ptr=ptr;
        return heapBytes;
    }
    static NewU32A(_size) : Uint32Array
    {
        if(CWASM.IsWASM()==false)
        {
            return new Uint32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=gWASM._malloc(numBytes);
        var heapBytes=gWASM.HEAPU32.subarray(ptr/4, ptr/4+(numBytes/4));
       
        heapBytes.ptr=ptr;
        return heapBytes;
    }

    static NewF32A(_size) : Float32Array
    {
        if(CWASM.IsWASM()==false)
        {
            return new Float32Array(_size);
        }

        var numBytes=_size*4;
        var ptr=gWASM._malloc(numBytes);
        var heapBytes=gWASM.HEAPF32.subarray(ptr/4, ptr/4+(numBytes/4));
       
        heapBytes.ptr=ptr;
        return heapBytes;
    }
    static ProductF32A(_count)
    {
        let F32A=g_F32A2.Pop();
        if(F32A==null)
            F32A=CWASM.NewF32A(_count);
        for(let i=0;i<_count;++i)
            F32A[i]=0;
        return F32A;
    }
    static Recycle(_F32A : Float32Array)
    {
        if(_F32A["ptr"]==null)  return;

        switch(_F32A.byteLength)
        {
            case 12:    g_F32A3.Push(_F32A);    break;
            case 16:    g_F32A4.Push(_F32A);    break;
            case 64:    g_F32A16.Push(_F32A);    break;
            case 96:    g_F32A24.Push(_F32A);    break;
            default:
                
                console.log("f32a error");
                break;
        }
        
    }

    static PlaneSphereInside(_planePtr : number,_posPtr : number,_radius : number)
    {
        return gWASM._PlaneSphereInside(_planePtr,_posPtr,_radius);
    }
    static V3Distance(_a : number,_b : number) : number
    {
        return gWASM._V3Distance(_a,_b);
    }
    
    static BoundMulMat(_tminPtr : number,_tmaxPtr  : number,_ominPtr  : number,_omaxPtr  : number,_matPtr  : number,_center  : number) : number
    {
        return gWASM._BoundMulMat(_tminPtr,_tmaxPtr,_ominPtr,_omaxPtr,_matPtr,_center);
    }
    static MatMemcpy(_a : number,_b : number)
    {
        gWASM._MatMemcpy(_a,_b);
    }
    static MatMul(_a : number,_b : number,_dst : number)
    {
        gWASM._MatMul(_a,_b,_dst);
    }
    static MatInvert(_src : number,_dst : number)
    {
        gWASM._MatInvert(_src,_dst);
    }
    static Checker(_data : number)
    {
        gWASM.HEAPU32[gDummy/4]=_data;
        gWASM.HEAPU8[gDummy + 4] = 0;
        return gWASM._Checker(gDummy);
    }

   
    static SourceExcute(_filename: string, _encoded: string): string
    {
        const BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const ALEN = 62, KLEN = 16;

        // 1. FNV-1a 32bit
        let h = 0x811c9dc5;
        for (let i = 0; i < _filename.length; i++) {
            h ^= _filename.charCodeAt(i);
            h = (h * 0x01000193) >>> 0;
        }

        // 2. Fisher-Yates shuffle
        const arr = BASE.split('');
        let seed = h;
        for (let i = ALEN - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const j = seed % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const alph = arr.join('');

        // 3. XOR 키 파생
        let xorKey = '';
        for (let i = 0; i < KLEN; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            xorKey += alph[seed % ALEN];
        }

        // 4. XOR 디코딩
        let r = '';
        for (let i = 0; i < _encoded.length; i += 2) {
            const b = alph.indexOf(_encoded[i]) * 62 + alph.indexOf(_encoded[i + 1]);
            r += String.fromCharCode(b ^ xorKey.charCodeAt((i / 2) % KLEN));
        }
        return r;
        //  if (gWASM == null) {
        //     await gReadyPromise;  // Init() 완료까지 대기
        // }

        // const encoder = new TextEncoder();

        // // filename → WASM 메모리
        // const fnBytes = encoder.encode(_filename);
        // const fnPtr   = gWASM._malloc(fnBytes.length + 1);
        // gWASM.HEAPU8.set(fnBytes, fnPtr);
        // gWASM.HEAPU8[fnPtr + fnBytes.length] = 0;

        // // encoded → WASM 메모리
        // const encBytes = encoder.encode(_encoded);
        // const encPtr   = gWASM._malloc(encBytes.length + 1);
        // gWASM.HEAPU8.set(encBytes, encPtr);
        // gWASM.HEAPU8[encPtr + encBytes.length] = 0;

        // // WASM 함수 호출
        // const resultPtr: number = gWASM._SourceExcute(fnPtr, encPtr);

        // // 임시 버퍼 해제
        // gWASM._free(fnPtr);
        // gWASM._free(encPtr);

        // if (resultPtr === 0)
        // {
        //     console.log("CWASM.SourceExcute: decode failed (null ptr)");
        //     return null;
        // }

        // // 결과 문자열 읽기
        // const result: string = gWASM.UTF8ToString(resultPtr);

        // // WASM에서 malloc한 결과 버퍼 해제 (Checker.h의 SourceFree 호출)
        // gWASM._SourceFree(resultPtr);

        // return result;
    }
}