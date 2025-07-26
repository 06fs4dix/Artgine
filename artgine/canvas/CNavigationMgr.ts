
import { CCIndex } from "./CCIndex.js";
import {CNavigation} from "./component/CNavigation.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CBound } from "../geometry/CBound.js";

export class CAster
{
    constructor()
    {
        //this.org=_org.CopyExport() as CCIndex;
    }
    public cur : CCIndex=null;//current
    public pre : CCIndex=null;//previous
    //public bef : CVec3;
    public cost : number=0; 
    public total : number=0;
}
export class CNaviPos
{
    constructor(_navi : CNavigation)
    {
        this.mNavigation=_navi;
        this.mPos=_navi.GetOwner().GetPos().Export();
    }
    mNavigation : CNavigation;
    mPos : CVec3;
}
class CNaviData
{
    mKeyS : Int32Array;//5
    mKeyN : Int32Array;//1
    mNavi=new Map<number,CNaviPos>();
}
export class CNaviMgr
{
    mSize =new CVec3();
    mPos = new CVec3();
    // m_keyDataS : Int32Array;//5
    // m_keyDataN : Int32Array;//1
   
    //데이터 리스트를 쓰는 이유는 여러개가 쓰이는중 길찾기를 하면 아직 쓰이지 않은 오브젝트를 찾을수 없어서
    mData=new Array<CNaviData>();
    mRead=0;
    mWrite=0;

    SC : number=5;
    //m_visit=new CArray<CAster>();
    //m_find=new CArray<CAster>();

    Init(_size : CVec3)
    {
        this.SC=CNavigation.Normal/CNavigation.Small;
        this.mSize=_size;
        for(let i=0;i<2;++i)
        {
            let data=new CNaviData();
            data.mKeyN=new Int32Array(_size.x*_size.y*_size.z);
            data.mKeyN.fill(0);
            data.mKeyS=new Int32Array(_size.x*this.SC*_size.y*this.SC*_size.z*this.SC);
            data.mKeyS.fill(0);
            this.mData.push(data);
        }

        // this.m_keyDataN=new Int32Array(_size.x*_size.y*_size.z);
        // this.m_keyDataN.fill(0);
        // this.m_keyDataS=new Int32Array(_size.x*this.SC*_size.y*this.SC*_size.z*this.SC);
        // this.m_keyDataS.fill(0);

    }
    Write(_navi : CNavigation,_remove : boolean)
    {
        
    }
    W()
    {
        return this.mData[this.mWrite];
    }
    R()
    {
        return this.mData[this.mRead];
    }
    Reset(_all=false)
    {
        this.mRead=this.mWrite;
        this.mWrite++;
        if(this.mWrite>=this.mData.length)
            this.mWrite=0;

        if(this.W()==null)  return;

        if(_all)
        {
            for(let i=0;i<this.mData.length;++i)
            {
                this.mData[i].mKeyN.fill(0);
                this.mData[i].mKeyS.fill(0);
                this.mData[i].mNavi.clear();
            }

           
            return;
        }
        let removeList=new Array<number>();
        for(let key of this.W().mNavi.keys())
        {
            let navi=this.W().mNavi.get(key);
            if(navi.mNavigation.mStatic==false)
            {
                this.Write(navi.mNavigation,true);
                removeList.push(key);
            }
           
        }
        for(let key of removeList)
        {
            this.W().mNavi.delete(key);
        }
        
    }
    Read(_pt : CCIndex,_pass : Set<number>,_small : boolean)
    {
        return null;
    }
    InChk(_pt : CCIndex,_pass : Set<number>,_small : boolean,_off : CVec3,_size : CVec3)
    {
        return false;
    }
    
    DownPoint(_pt : CCIndex,_size : CVec3,_pass : Set<number>,_2d : boolean,_small : boolean)
    {
        return null;
    }
    EmptyPoint(_pt : CCIndex,_off : CVec3,_size : CVec3,_pass : Set<number>,_2d : boolean,_small : boolean) : CCIndex
    {
        return null;
    }


    /*
    높이값 처리하기
    복셀 쓰기기능 처리하기
    */
    PathAll(_st : CVec3,_ed : CVec3,_bound : CBound,_2d : boolean,_pass : Set<number>=new Set<number>())
    {
        return null;
    }
    PosInChk(_pos : CVec3,_pass : Set<number>,_bound : CBound,_2d : boolean)
    {
        return null;
    }
    Path(_st : CVec3,_ed : CVec3,_bound : CBound,_pass : Set<number>,_2d : boolean,_small=false) : Array<CVec3>
    {
        return null;
        
    }

}


import CNaviMgr_imple from "../canvas_imple/CNavigationMgr.js";

CNaviMgr_imple();