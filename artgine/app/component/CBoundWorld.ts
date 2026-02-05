import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";

export class CBoundWorld
{
	
	mBound : CBound=new CBound();//원본 위치값 가지는 바운드
	mCenter : CVec3=new CVec3();//중심점
    //mPos : CVec3;//매트릭스에서 받아온 값


	mSize : CVec3=new CVec3();//사이즈만 추출한것
    mPos : CVec3=new CVec3();//매트릭스에서 받아온 값
    mRadian : number=0;

	//mMat : CMat;
	//mFBound : CBound;
	
	//
	

    Init(_LBound : CBound,_WMat : CMat)
    {
        //let dummy=new CVec3();
        this.mBound.Reset();
        this.mBound.mType=_LBound.mType;

        if(_LBound.mType==CBound.eType.Sphere)
        {
            this.mCenter.Zero();
            this.mSize.x=CMath.Max(Math.abs(_LBound.mMin.x),Math.abs(_LBound.mMax.x));
            this.mSize.y=CMath.Max(Math.abs(_LBound.mMin.y),Math.abs(_LBound.mMax.y));
            this.mSize.z=CMath.Max(Math.abs(_LBound.mMin.z),Math.abs(_LBound.mMax.z));
            this.mSize.x=this.mSize.y=this.mSize.z=CMath.Max(CMath.Max(this.mSize.x,this.mSize.y),this.mSize.z);
            

            this.mBound.InitBound(this.mSize.x);

            return;
        }

        this.mCenter.x=_LBound.mMin.x;this.mCenter.y=_LBound.mMin.y;this.mCenter.z=_LBound.mMin.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);

        
        this.mCenter.x=_LBound.mMin.x;this.mCenter.y=_LBound.mMin.y;this.mCenter.z=_LBound.mMax.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMin.x;this.mCenter.y=_LBound.mMax.y;this.mCenter.z=_LBound.mMin.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMin.x;this.mCenter.y=_LBound.mMax.y;this.mCenter.z=_LBound.mMax.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMax.x;this.mCenter.y=_LBound.mMin.y;this.mCenter.z=_LBound.mMin.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMax.x;this.mCenter.y=_LBound.mMin.y;this.mCenter.z=_LBound.mMax.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMax.x;this.mCenter.y=_LBound.mMax.y;this.mCenter.z=_LBound.mMin.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);
        

        
        this.mCenter.x=_LBound.mMax.x;this.mCenter.y=_LBound.mMax.y;this.mCenter.z=_LBound.mMax.z;
        if(_WMat!=null)
            this.mBound.InitBound(CMath.V3MulMatNormal(this.mCenter, _WMat,this.mSize));
        else
            this.mBound.InitBound(this.mCenter);

        this.mBound.GetCenter(this.mCenter);
        //this.mCenter.Zero();

        this.mBound.GetSize(this.mSize);
        // if(_2d)
        // {
        //     this.mBound.mMax.z=this.mBound.GetInRadius();
        //     this.mBound.mMin.z=-this.mBound.mMax.z;
        // }
        
        //
        
        //this.mRadian*=0.5;


        

    }
    UpdateMat(_mat : CMat)
    {
        this.mPos.mF32A[0]=this.mCenter.mF32A[0]+_mat.mF32A[12];
        this.mPos.mF32A[1]=this.mCenter.mF32A[1]+_mat.mF32A[13];
        this.mPos.mF32A[2]=this.mCenter.mF32A[2]+_mat.mF32A[14];
    }

}
export class CBoundWorldPaint extends CBoundWorld
{
    override Init(_LBound : CBound,_WMat : CMat)
    {
        super.Init(_LBound,_WMat);
        this.mRadian=this.mBound.GetOutRadius();
    }
    
}

export class CBoundWorldCollider extends CBoundWorld
{
    mMat : CMat=new CMat();
    mIMat : CMat=new CMat();
	mWBound : CBound=new CBound();
    dirPoint : CVec3=new CVec3();
    override Init(_LBound : CBound,_WMat : CMat)
    {
        super.Init(_LBound,_WMat);
        this.mRadian=this.mBound.GetInRadius();
    }
    override UpdateMat(_mat : CMat)
    {
        super.UpdateMat(_mat);
        this.mMat.Import(_mat);
        if(_mat.IsRotScaUnit())
            this.mIMat.Unit();
        else
            CMath.MatInvert(this.mMat,this.mIMat);
        this.mWBound.mMin.mF32A[0]=this.mBound.mMin.mF32A[0]+this.mMat.mF32A[12];
        this.mWBound.mMin.mF32A[1]=this.mBound.mMin.mF32A[1]+this.mMat.mF32A[13];
        this.mWBound.mMin.mF32A[2]=this.mBound.mMin.mF32A[2]+this.mMat.mF32A[14];

        this.mWBound.mMax.mF32A[0]=this.mBound.mMax.mF32A[0]+this.mMat.mF32A[12];
        this.mWBound.mMax.mF32A[1]=this.mBound.mMax.mF32A[1]+this.mMat.mF32A[13];
        this.mWBound.mMax.mF32A[2]=this.mBound.mMax.mF32A[2]+this.mMat.mF32A[14];
        
    }
    getFarthestPointInDirection(v)
    {
        let r=Math.random()*0.00001;
        if(this.mBound.GetType()==CBound.eType.Sphere)
        {
            CMath.V3Nor(v,this.dirPoint);
            CMath.V3MulFloat(this.dirPoint, this.mRadian+r,this.dirPoint);
            CMath.V3AddV3(this.dirPoint, this.mMat.xyz,this.dirPoint);
        
        }
        else if(this.mBound.GetType()==CBound.eType.Box)
        {
            //let vNor=CPoolGeo.ProductV3();
                    
            CMath.V3MulMatNormal(v, this.mIMat,this.dirPoint);
            this.dirPoint.mF32A[0] = (this.dirPoint.mF32A[0] > 0) ? this.mWBound.mMax.mF32A[0]+r : this.mWBound.mMin.mF32A[0]-r;
            this.dirPoint.mF32A[1] = (this.dirPoint.mF32A[1] > 0) ? this.mWBound.mMax.mF32A[1]+r : this.mWBound.mMin.mF32A[1]-r;
            this.dirPoint.mF32A[2] = (this.dirPoint.mF32A[2] > 0) ? this.mWBound.mMax.mF32A[2]+r : this.mWBound.mMin.mF32A[2]-r;
            //CMath.V3MulMatCoordi(vNor, this.modelMatrix,this.dirPoint);
            //CPoolGeo.RecycleV3(vNor);
        }
        else
        {
            var dir = CMath.V3MulMatNormal(v, this.mIMat);
            var furthest_point=new CVec3();
            if(this.mBound.mPos.Size()!=0)
                furthest_point = this.mBound.mPos.Find(0);
            var max_dot = CMath.V3Dot(furthest_point, dir);

            for (var i = 1; i < this.mBound.mPos.Size(); i++) {
                
                var d = CMath.V3Dot(this.mBound.mPos.Find(i), dir);
                if (d > max_dot) {
                    max_dot = d;
                    furthest_point = this.mBound.mPos.Find(i);
                }
            }
            CMath.V3MulMatCoordi(furthest_point, this.mMat,this.dirPoint);
        }
        return this.dirPoint;
    }
}