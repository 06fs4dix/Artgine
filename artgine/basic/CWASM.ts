import SIMDModule from "../wasm/WASM_SIMD.js";
import NoSIMDModule from "../wasm/WASM_NoSIMD.js";
import {CAlert} from "./CAlert.js";
import {CArray} from "./CArray.js";
import {CConsol} from "./CConsol.js";
import { CPath } from "./CPath.js";

var g_F32A2=new CArray<Float32Array>();
var g_F32A3=new CArray<Float32Array>();
var g_F32A4=new CArray<Float32Array>();
var g_F32A16=new CArray<Float32Array>();
var g_F32A24=new CArray<Float32Array>();

var gWASM=null;
var gThread=true;
var gSimd=false;
var gDummy : any;
export class CWASM
{
    static SetThread(_enable)
    {
        gThread=_enable;
    }
    static GetThread()  {   return gThread;    }
    static async Init(_simd : boolean)
    {
        if(_simd)
        {
            if (typeof WebAssembly === "object" && typeof WebAssembly.FeatureDetect === "function") 
            {
                gSimd=await WebAssembly.FeatureDetect("simd");

            }
            else if (WebAssembly && WebAssembly.validate) 
            {
                try {
                    await WebAssembly.compileStreaming(fetch(CPath.PHPC()+"artgine/wasm/WASM_SIMD.wasm"));
                    gSimd=true;
                } catch (e) {
                    console.log("SIMD 미지원");
                }
            }
        }
        
        if(gWASM==null)
        {
            gWASM={};
            if(gSimd)   await SIMDModule(gWASM);
            else   await NoSIMDModule(gWASM);

            let path=CPath.PHPC();
            const encoder = new TextEncoder();
            const encoded = encoder.encode(path); 
            let ptr = gWASM._malloc(encoded.length + 1);
            gWASM.HEAPU8.set(encoded, ptr);
            gWASM.HEAPU8[ptr + encoded.length] = 0;
            gWASM._Init(ptr);
            gWASM._free(ptr);

            gDummy = gWASM._malloc(4);
            
            

            
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
    // static Module()
    // {
    //     return gWASM;
    // }
    // static IsEnable()
    // {
    //     return g_wasm!=null;
    // }

    
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
        //return new Float32Array(_size);
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
                CAlert.E("f32a error");
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
    // static OctreeInit(_mgrKey : number, _center : number, _half : number) {
    //     gWASM._OctreeInit(_mgrKey, _center, _half);
    // }
    // static OctreeBuild(_mgrKey : number,_depth) {
    //     gWASM._OctreeBuild(_mgrKey,_depth);
    // }
    // static OctreeInsert(_mgrKey : number, _id : number, _center : number, _size : number,_layer : string) {
    //     gWASM._OctreeInsert(_mgrKey, _id, _center, _size,_layer);
    // }
    // static OctreeInsideRay(_mgrKey : number, _dir : number, _pos : number, _org : number, _results : number) {
    //     gWASM._OctreeInsideRay(_mgrKey, _dir, _pos, _org, _results);
    // }
    // static OctreeInsidePlane(_mgrKey : number, _plane : number, _results : number) {
    //     gWASM._OctreeInsidePlane(_mgrKey, _plane, _results);
    // }
    // static OctreeInsideBox(_mgrKey : number, _bmin : number, _bmax : number, _results : number) {
    //     gWASM._OctreeInsideBox(_mgrKey, _bmin, _bmax, _results);
    // }
    // static OctreeGetBound(_mgrKey : number,) : string{
    //     //var test=g_wasm.UTF8ToString(g_wasm._OctreeGetBound(_mgrKey));
    //     return gWASM.UTF8ToString(gWASM._OctreeGetBound(_mgrKey));
    // }
    // static OctreeAllInsideBoxCac(_mgrKey : number) {
    //     gWASM._OctreeAllInsideBoxCac(_mgrKey);
    // }
    // static OctreeAllInsideBoxResult(_mgrKey : number,_pool : number, _results : number) {
    //     gWASM._OctreeAllInsideBoxResult(_mgrKey,_pool,_results);
    // }
    
    
}