import {CArray} from "../basic/CArray.js";
import {CBound} from "./CBound.js";
import {CMath} from "./CMath.js";
import {CPlane} from "./CPlane.js";
import {CVec3} from "./CVec3.js";
import {CUtilMath} from "./CUtilMath.js";

export class COctreeData
{
    mData : any = null;
    mCenter : CVec3 = new CVec3();
    mSize : CVec3 = new CVec3();
    mMin : CVec3 = new CVec3();
    mMax : CVec3 = new CVec3();
    mCol=new CArray<COctreeData>();
    mUpdate=0;
    

    constructor() {
        //this.m_data = null;
        //this.m_center.CopyImport(_center);
        //this.m_size.CopyImport(_size);
  
    }
}
export class COctree 
{
	mCenter : CVec3;
	mHalf : CVec3;
	mChild : Array<COctree> = null;
	mData : Array<COctreeData> = null;
    mMax : CVec3 = new CVec3();
    mBound : CBound;
    //m_preCollusion=true;

    //복사로 사용한다 위험한데 최적화
    constructor(_center:CVec3, _half:CVec3) {
        // this.mCenter.Import(_center);
        // this.mHalf.Import(_half);
        this.mCenter=_center;
        this.mHalf=_half;
        this.mBound=new CBound();

    }
    ContainingPoint(point : CVec3) : number
    {
        return 0;
    }
    

    IsLeafNode() {
        return this.mChild == null;
    }

    SelectChild(point : CVec3) : COctree
    {
        return null;
    }
    ResetBound(_max : CVec3)
    {
        
    }
    SortXMinData()
    {
        
        
    }
    Insert(_ocData : COctreeData,_depth : number) 
    {

    }
    // InsideRay(bray : CRay, results: Function)
    // {
    //     if(this.IsLeafNode()) {
    //         for(var i=0;i<this.m_data.length;++i){

    //             g_maxDummy.mF32A[0]=this.m_data[i].m_center.mF32A[0] + this.m_data[i].m_size.mF32A[0] * 0.5;
    //             g_maxDummy.mF32A[1]=this.m_data[i].m_center.mF32A[1] + this.m_data[i].m_size.mF32A[1] * 0.5;
    //             g_maxDummy.mF32A[2]=this.m_data[i].m_center.mF32A[2] + this.m_data[i].m_size.mF32A[2] * 0.5;

    //             g_minDummy.mF32A[0]=this.m_data[i].m_center.mF32A[0] - this.m_data[i].m_size.mF32A[0] * 0.5;
    //             g_minDummy.mF32A[1]=this.m_data[i].m_center.mF32A[1] - this.m_data[i].m_size.mF32A[1] * 0.5;
    //             g_minDummy.mF32A[2]=this.m_data[i].m_center.mF32A[2] - this.m_data[i].m_size.mF32A[2] * 0.5;

    //             if(CMath.RayBoxIS(g_minDummy,g_maxDummy,bray)) {
    //                 results(this.m_data[i]);
    //             }
    //         }
    //     } else {
    //         for (let i = 0; i < this.m_childe.length; ++i) {
    //             if(this.m_childe[i]==null)  continue;
                
    //             g_maxDummy.mF32A[0]=this.m_childe[i].m_center.mF32A[0] + this.m_childe[i].m_half.mF32A[0]+this.m_max.mF32A[0];
    //             g_maxDummy.mF32A[1]=this.m_childe[i].m_center.mF32A[1] + this.m_childe[i].m_half.mF32A[1]+this.m_max.mF32A[1];
    //             g_maxDummy.mF32A[2]=this.m_childe[i].m_center.mF32A[2] + this.m_childe[i].m_half.mF32A[2]+this.m_max.mF32A[2];

    //             g_minDummy.mF32A[0]=this.m_childe[i].m_center.mF32A[0] - this.m_childe[i].m_half.mF32A[0]-this.m_max.mF32A[0];
    //             g_minDummy.mF32A[1]=this.m_childe[i].m_center.mF32A[1] - this.m_childe[i].m_half.mF32A[1]-this.m_max.mF32A[1];
    //             g_minDummy.mF32A[2]=this.m_childe[i].m_center.mF32A[2] - this.m_childe[i].m_half.mF32A[2]-this.m_max.mF32A[2];

    //             if(CMath.RayBoxIS(g_minDummy,g_maxDummy,bray)) {
    //                 this.m_childe[i].InsideRay(bray, results);
    //             }
    //         }
    //     }


    // }
    InsidePlane(bplane : CPlane, results: Function)
    {
        if(this.IsLeafNode()) {
            for(var i=0;i<this.mData.length;++i) {
                results(this.mData[i]);
            }
        } else {
            for (let i = 0; i < this.mChild.length; ++i) {
                if(this.mChild[i]==null)  continue;
                
                var r = CMath.Max(CMath.Max(this.mHalf.mF32A[0],this.mHalf.mF32A[1]),this.mHalf.mF32A[2]);
                var rad = Math.sqrt(r*r+r*r+r*r);
                if(CUtilMath.PlaneSphereInside(bplane,this.mChild[i].mCenter,rad,null)) {
                    this.mChild[i].InsidePlane(bplane, results);
                }
            }
        }

    }

    InsideBox(bmin:CVec3, bmax:CVec3, results: Function,_ocd : COctreeData=null)
    {

    }
}
export class COctreeMgr
{

    mOctree : COctree;

    mOCDMap=new Map<any,COctreeData>();
    mBound : CBound;
    mUpdate=0;
 


    constructor(_wasm=null)
    {
        this.mBound = new CBound();
        this.mBound.mMin.x=-100;this.mBound.mMin.y=-100;this.mBound.mMin.z=-100;
        this.mBound.mMax.x=100;this.mBound.mMax.y=100;this.mBound.mMax.z=100;
        this.mOctree=null;

    }
    
    RegistHeap(_F32A: Float32Array) {
        
    }
    GetBound()
    {
        let bList=new Array<CBound>();

        let que=new Array<COctree>();
        if(this.mOctree.mChild==null)
        {
            return bList;
        }
        for(let i=0;i<this.mOctree.mChild.length;++i)
        {
            if(this.mOctree.mChild[i]!=null)
                que.push(this.mOctree.mChild[i]);
        }

        

        while(que.length>0)
        {
            let pst=que.splice(0,1)[0];
            if(pst==null)   continue;
            bList.push(pst.mBound);
            if(pst.mChild!=null)
            {
                for(let i=0;i<pst.mChild.length;++i)
                    que.push(pst.mChild[i]);
            }
            

        }

        return bList;
    }
   

    Build()
    {
        

    }
    
    Insert(_center : CVec3, _size : CVec3, _data : any,_min : CVec3=null,_max : CVec3=null) 
    {

    }

    // InsideRay(_bray : CRay, _results : Function)
    // {
       
    //     this.m_oc.InsideRay(_bray, _results);
        
        
    // }

    InsidePlane(_bplane : CPlane, _results : Function)
    {
       
        this.mOctree.InsidePlane(_bplane, _results);  
        
        
    }
    InsideBoxData(_bmin:CVec3, _bmax:CVec3, _results:Function,_data : any)
    {
        let odata=this.mOCDMap.get(_data);
        if(odata==null) return;

        for(let i=0;i<odata.mCol.Size();++i)
        {
            _results(odata.mCol.Find(i));
        }
        this.mOctree.InsideBox(_bmin, _bmax, _results,odata);
    }
    InsideBox(_bmin:CVec3, _bmax:CVec3, _results:Function)
    {
        this.mOctree.InsideBox(_bmin, _bmax, _results);
    }
    InsideBoxArr(_bmin:CVec3, _bmax:CVec3, _results:CArray<any>)
    {
        this.mOctree.InsideBox(_bmin, _bmax, (_ocData : COctreeData)=>{
            _results.Push(_ocData.mData);
        });
    }


    
}

import COctree_imple from "../geometry_imple/COctree.js";
COctree_imple();