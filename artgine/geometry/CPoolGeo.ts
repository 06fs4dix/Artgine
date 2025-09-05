import {CQueue} from "../basic/CQueue.js";
import {CBound} from "./CBound.js";
import {CMat} from "./CMat.js";
import {CRay} from "./CRay.js";
import {CVec3} from "./CVec3.js";
import {CVec4} from "./CVec4.js";

var gV3=new CQueue<CVec3>();
var gV4=new CQueue<CVec4>();
var gMat=new CQueue<CMat>();
var gBound=new CQueue<CBound>();
var gRay=new CQueue<CRay>();

var maxLen=0;

export class CPoolGeo
{
    static V3()
    {
        return gV3;
    }
    static ProductV3()
    {
       
        let data=gV3.Dequeue();
        if(data==null)  data=new CVec3();
        return data;
    }
    static RecycleV3(_v : CVec3)
    {
        gV3.Enqueue(_v);
        // if(gV3.HasDuplicate())
        // {
        //     alert("HasDuplicate");
        // }
    }
    static ProductV4()
    {
        let data=gV4.Dequeue();
        if(data==null)  data=new CVec4();
        return data;
    }
    static RecycleV4(_v : CVec4)
    {
        gV4.Enqueue(_v);
    }
    static ProductMat()
    {
        let data=gMat.Dequeue();
        if(data==null)  data=new CMat();
        return data;
    }
    static RecycleMat(_v : CMat)
    {
        gMat.Enqueue(_v);
    }
    static ProductBound()
    {
        let data=gBound.Dequeue();
        if(data==null)  data=new CBound();
        return data;
    }
    static RecycleBound(_v : CBound)
    {
        gBound.Enqueue(_v);
    }
    static ProductRay()
    {
        let data=gRay.Dequeue();
        if(data==null)  data=new CRay();
        return data;
    }
    static RecycleRay(_v : CRay)
    {
        gRay.Enqueue(_v);
    }
}