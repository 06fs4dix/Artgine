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
let gOctreePool : Array<COctree>=[];
let gOCCount=0;
export class COctree 
{
    mPool : CArray<COctree>;
	mCenter : CVec3;
	mHalf : CVec3;
	mChild : Array<COctree> = null;
	mData : Array<COctreeData> = null;
    mMax : CVec3 = new CVec3();
    mBound : CBound;
    //m_preCollusion=true;

    //복사로 사용한다 위험한데 최적화
    constructor(_center:CVec3, _half:CVec3,_pool=null) 
    {
        // this.mCenter.Import(_center);
        // this.mHalf.Import(_half);
        this.mCenter=_center;
        this.mHalf=_half;
        this.mBound=new CBound();
        this.mPool=_pool;
    }
    NewChild(_center:CVec3, _half:CVec3)
    {
        if(this.mPool==null)
            return new COctree(_center,_half);
        let oc=this.mPool.New(COctree) as COctree;
        oc.mCenter=_center;
        oc.mHalf=_half;
        oc.mPool=this.mPool;
        oc.mChild=null;
        oc.mData=null;
        oc.mBound.Reset();
        oc.mMax.Zero();

        return oc;
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
    InsideRay(_ray : CRay, _RayLength : number, _boundary : number, results : Function)
    {
        if(this.IsLeafNode()) 
        {
            if(this.mData == null) return;
            
            // 레이 정보
            const vecList = _ray.GetVecList();
            const rayDir = vecList[0];  // direction
            const rayOrigin = vecList[2];  // origin
            
            // 재사용할 CVec3 객체 (RayBoxIS 호출용)
            const boxMin = new CVec3();
            const boxMax = new CVec3();
            
            const rayLengthSq = _RayLength * _RayLength;
            
            // x축으로 정렬된 데이터 순회
            for(var i = 0; i < this.mData.length; ++i) 
            {
                // x축 정렬 최적화: 레이가 +x 방향일 때만 적용
                if(rayDir.mF32A[0] > 0) 
                {
                    // 레이의 x축 최대 도달 지점
                    const rayMaxX = rayOrigin.mF32A[0] + rayDir.mF32A[0] * _RayLength + _boundary;
                    
                    // 객체의 최소 x가 레이 도달 범위를 넘으면 조기 종료
                    if(this.mData[i].mMin.mF32A[0] - _boundary > rayMaxX)
                        break;
                }
                // rayDir.x <= 0 이면 x축 최적화 불가 (모든 객체 체크 필요)
                
                // 바운딩 박스를 boundary만큼 확장
                boxMax.mF32A[0] = this.mData[i].mCenter.mF32A[0] + this.mData[i].mSize.mF32A[0] * 0.5 + _boundary;
                boxMax.mF32A[1] = this.mData[i].mCenter.mF32A[1] + this.mData[i].mSize.mF32A[1] * 0.5 + _boundary;
                boxMax.mF32A[2] = this.mData[i].mCenter.mF32A[2] + this.mData[i].mSize.mF32A[2] * 0.5 + _boundary;
                
                boxMin.mF32A[0] = this.mData[i].mCenter.mF32A[0] - this.mData[i].mSize.mF32A[0] * 0.5 - _boundary;
                boxMin.mF32A[1] = this.mData[i].mCenter.mF32A[1] - this.mData[i].mSize.mF32A[1] * 0.5 - _boundary;
                boxMin.mF32A[2] = this.mData[i].mCenter.mF32A[2] - this.mData[i].mSize.mF32A[2] * 0.5 - _boundary;
                
                if(CUtilMath.RayBoxIS(boxMin, boxMax, _ray)) 
                {
                  
                    let len=CMath.V3Distance(_ray.GetOriginal(),_ray.GetPosition());
                    
                    if(len+_boundary <= _RayLength)  // 거리 이내일 때만 재귀
                    {
                        
                        results(this.mData[i]);
                        
                    }
                }
            }
        } 
        else 
        {
            

            // 재사용할 CVec3 객체 (child 바운딩 박스 체크용)
            const childMin = new CVec3();
            const childMax = new CVec3();
            
            
            
            for (let i = 0; i < this.mChild.length; ++i) 
            {
                if(this.mChild[i] == null) continue;
                
                // Child의 바운딩 박스를 boundary만큼 확장
                childMax.mF32A[0] = this.mChild[i].mCenter.mF32A[0] + this.mChild[i].mHalf.mF32A[0] + this.mMax.mF32A[0] + _boundary;
                childMax.mF32A[1] = this.mChild[i].mCenter.mF32A[1] + this.mChild[i].mHalf.mF32A[1] + this.mMax.mF32A[1] + _boundary;
                childMax.mF32A[2] = this.mChild[i].mCenter.mF32A[2] + this.mChild[i].mHalf.mF32A[2] + this.mMax.mF32A[2] + _boundary;
                
                childMin.mF32A[0] = this.mChild[i].mCenter.mF32A[0] - this.mChild[i].mHalf.mF32A[0] - this.mMax.mF32A[0] - _boundary;
                childMin.mF32A[1] = this.mChild[i].mCenter.mF32A[1] - this.mChild[i].mHalf.mF32A[1] - this.mMax.mF32A[1] - _boundary;
                childMin.mF32A[2] = this.mChild[i].mCenter.mF32A[2] - this.mChild[i].mHalf.mF32A[2] - this.mMax.mF32A[2] - _boundary;
                
                if(CUtilMath.RayBoxIS(childMin, childMax, _ray)) 
                {

                    let len=CMath.V3Distance(_ray.GetOriginal(),_ray.GetPosition());
                    
                    if(len+_boundary <= _RayLength)  // 거리 이내일 때만 재귀
                    {
                        this.mChild[i].InsideRay(_ray, _RayLength, _boundary, results);
                    }
                }
            }
        }
    }
   
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
export type COctreeInsideHandler = (_ocData : COctreeData) => void;

export class COctreeMgr
{

    mOctree : COctree;

    mOCDMap=new Map<any,COctreeData>();
    mBound : CBound;
    mUpdate=0;
    mPool =new CArray<COctree>;


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

    InsideRay(_ray : CRay, _RayLength : number, _boundary : number, results : Function)
    {
       
        this.mOctree.InsideRay(_ray, _RayLength,_boundary,results);
        
        
    }

    InsidePlane(_bplane : CPlane, _results : Function)
    {
       
        this.mOctree.InsidePlane(_bplane, _results);  
        
        
    }
    InsideBoxData(_bmin:CVec3, _bmax:CVec3, _results:COctreeInsideHandler,_data : any)
    {
        let odata=this.mOCDMap.get(_data);
        if(odata==null) return;

        for(let i=0;i<odata.mCol.Size();++i)
        {
            _results(odata.mCol.Find(i));
        }
        this.mOctree.InsideBox(_bmin, _bmax, _results,odata);
    }
    InsideBox(_bmin:CVec3, _bmax:CVec3, _results:COctreeInsideHandler)
    {
        this.mOctree.InsideBox(_bmin, _bmax, _results);
    }
    InsideBoxArr(_bmin:CVec3, _bmax:CVec3, _results:CArray<any>)
    {
        this.mOctree.InsideBox(_bmin, _bmax, (_ocData : COctreeData)=>{
            _results.Push(_ocData.mData);
        });
    }
    

    Find(_st: CVec3, _ed: CVec3, _bound: CBound,_layerPass = null,_size = 100) : Array<CVec3>
    {
         // ✅ 시작점과 끝점을 그리드에 스냅
        const st = new CVec3(
            Math.round(_st.x / _size) * _size,
            Math.round(_st.y / _size) * _size,
            Math.round(_st.z / _size) * _size
        );
        
        const ed = new CVec3(
            Math.round(_ed.x / _size) * _size,
            Math.round(_ed.y / _size) * _size,
            Math.round(_ed.z / _size) * _size
        );
        
        let jumpCount=0;

        let directionList=[
            new CVec3(1,0,0),
            new CVec3(-1,0,0),
            new CVec3(0,1,0),
            new CVec3(0,-1,0),
            new CVec3(1,1,0),
            new CVec3(1,-1,0),
            new CVec3(-1,-1,0),
            new CVec3(-1,1,0),
        ];
        let boundary=_bound.GetOutRadius();
        let openList=new Array<CASterNode>();
        let closeMap=new Map<string,CASterNode>();
        let apool=new CArray<CASterNode>();
        let NewAster=()=>{
            let a=apool.Pop();
            if(a==null)
                a=new CASterNode();
            return a;
        };


        var search=new CASterNode();
        search.cur=_st;
        //search.pre=st;
        openList.push(search);
        do
        {
            openList.sort((a,b)=>{ return b.total-a.total;});
            
            search=openList.pop();
            //CConsol.Log(search.cur.ToStr()+" total : "+search.total);
            
            let step=closeMap.get(search.Offset(_size));
            if(step!=null && step.cost<=search.cost)
            {
                apool.Push(search);
                continue;
            }

            closeMap.set(search.Offset(_size),search);
            if(CMath.V3Distance(search.cur,_ed)<=_size)
            {
                let aster=NewAster();
                aster.pre=search;
                aster.cur=_ed;
                aster.cost=search.cost+_size;
                aster.total=aster.cost;
                search=aster;
                break;
            }
            for(let i=0;i<directionList.length;++i)
            {

                let dir=directionList[i];
                let nextPos=CMath.V3MulFloat(dir,_size);
                let cost=CMath.V3Len(nextPos)*1.1;
                CMath.V3AddV3(nextPos,search.cur,nextPos);

                
                let ray = new CRay();
                ray.SetOriginal(search.cur);
                ray.SetDirect(dir);


                let collusion=false;
                this.InsideRay(ray,_size,boundary, (ocData: COctreeData) => {
                    if(_layerPass!=null && _layerPass(ocData)==true)    return;
                    collusion=true;
                });
              
                //막힌곳은 패스
                if(collusion)    continue;
                
                let aster=NewAster();
                aster.pre=search;
                aster.cur=nextPos;
                aster.cost=search.cost+cost;
                aster.total=aster.cost+CMath.V3Distance(nextPos,_ed);
                openList.push(aster);
                
            }
            if(closeMap.size>10000)
                return new Array();


            // 🆕 점프 체크: N번마다 현재 위치에서 목표까지 직선 경로 확인
            if(jumpCount<=0)
            {
                jumpCount=10;
                
                const jumpRay = new CRay();
                const dirToGoal = CMath.V3SubV3(_ed, search.cur);
                const distToGoal = CMath.V3Len(dirToGoal);
                const dirNormalized = CMath.V3Nor(dirToGoal);
                
                jumpRay.SetOriginal(search.cur);
                jumpRay.SetDirect(dirNormalized);
                
                let collisions: Array<{ocData: COctreeData, distance: number}> = [];
                
                this.InsideRay(jumpRay, distToGoal, boundary, (ocData: COctreeData) => {
                    if(_layerPass != null && _layerPass(ocData) == true) return;
                    
                    // 충돌 지점까지의 거리 계산
                    const collisionDist = CMath.V3Distance(search.cur, jumpRay.GetPosition());
                    collisions.push({ocData: ocData, distance: collisionDist});
                });
                
                if(collisions.length === 0)
                {
                    // 🎯 충돌 없음 - 목표까지 직선 경로로 도달 가능
                    let finalNode = NewAster();
                    finalNode.pre = search;
                    finalNode.cur = _ed;
                    finalNode.cost = search.cost + distToGoal;
                    finalNode.total = finalNode.cost;
                    search = finalNode;
                    break;
                }
                // else
                // {
                //     // 🔄 충돌 있음 - 가장 마지막(목표에 가까운) 충돌 지점 찾기
                //     collisions.sort((a, b) => b.distance - a.distance);
                //     const lastCollision = collisions[0];
                    
                //     // 마지막 충돌 지점 직전을 중간 목표로 설정
                //     const safeDistance = lastCollision.distance - boundary;
                    
                //     if(safeDistance > _size)
                //     {
                //         // const safePos = CMath.V3AddV3(
                //         //     search.cur, 
                //         //     CMath.V3MulFloat(dirNormalized, safeDistance)
                //         // );
                //         const rawSafePos = CMath.V3AddV3(
                //             search.cur, 
                //             CMath.V3MulFloat(dirNormalized, safeDistance)
                //         );
                        
                //         // ✅ 점프 위치도 그리드에 스냅
                //         const safePos = new CVec3(
                //             Math.round(rawSafePos.x / _size) * _size,
                //             Math.round(rawSafePos.y / _size) * _size,
                //             Math.round(rawSafePos.z / _size) * _size
                //         );
                        
                //         // 중간 지점을 새로운 노드로 추가
                //         let jumpNode = NewAster();
                //         jumpNode.pre = search;
                //         jumpNode.cur = safePos;
                //         jumpNode.cost = search.cost + safeDistance;
                //         jumpNode.total = jumpNode.cost + CMath.V3Distance(safePos, _ed);
                        
                //         openList.push(jumpNode);
                //         continue;
                //     }
                // }
            }//jump
            jumpCount--;
        }while(openList.length!=0)
        
        var dirL=new CVec3();
        var path=new Array<CVec3>();
        while(true)
        {
            
            if(search.total==0)
            { 
                path.push(search.cur);
                break;
            }
            var dirP=CMath.V3Nor(CMath.V3SubV3(search.cur,search.pre.cur));
           
           
            if(dirL.Equals(dirP)==false)
                path.push(search.cur);
          
            
                
            dirL=dirP;
            search=search.pre;
        
        }
        path.reverse();
        return path;
    }
    
}

import COctree_imple from "../geometry_imple/COctree.js";
import { CRay } from "./CRay.js";
import { CConsol } from "../basic/CConsol.js";
COctree_imple();
class CASterNode
{
    public cur : CVec3=null;//current
    public pre : CASterNode=null;//previous
    
    public cost : number=0; 
    public total : number=0;
    Offset(size = 100) {
        const gridX = Math.floor(this.cur.x / size);
        const gridY = Math.floor(this.cur.y / size);
        const gridZ = Math.floor(this.cur.z / size);
        
        return `${gridX},${gridY},${gridZ}`;
    }
}