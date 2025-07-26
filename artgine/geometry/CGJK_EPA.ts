
import {CVec3} from "../geometry/CVec3.js"
import {CMat} from "../geometry/CMat.js"
import {CMath} from "../geometry/CMath.js"
import {CBound} from "../geometry/CBound.js"
import {CArray} from "../basic/CArray.js"
import {CObject} from "../basic/CObject.js"
import {CPoolGeo} from "./CPoolGeo.js"

export class CGJKShape extends CObject
{
	protected modelMatrix : CMat;
	protected inversMatrix : CMat;
    protected dirPoint : CVec3;
	constructor()
	{
        super();
		this.modelMatrix=new CMat();	
		this.inversMatrix=new CMat();
        this.dirPoint=new CVec3();
	}
	SetMatrix(_mat : CMat)
    {
        this.modelMatrix=_mat;
    }
    SetMatrixDown(_mat : CMat,_pos : CVec3)
    {
		if(this.modelMatrix==null)
            this.modelMatrix=new CMat();
    }
    
	GetMatrix()
	{
        if(this.modelMatrix==null)
            return new CMat();
		return this.modelMatrix;
	}
	getFarthestPointInDirection(v): CVec3
	{
		return this.dirPoint;
	}
	static NewCBound(_bound : CBound,_2d=false) : CGJKShape
	{
		switch (_bound.GetType()) 
		{
        case CBound.eType.Polytope:
            return new CGJKPolytope(_bound.mPos);
        case CBound.eType.Box:case CBound.eType.Voxel:
            return new CGJKBox(_bound.mMin, _bound.mMax);
        case CBound.eType.Sphere:
            {
                let size=_bound.GetSize();
                if(_2d)
                    size.z=0;
                return new CGJKSphere(size);
            }
            
        }
		return null;
	}
};
export class CGJKSphere extends CGJKShape
{
    private r : number;
	private size : CVec3;
    private sca : CVec3;
	constructor(_size:CVec3=new CVec3())
	{
		super();

        this.size = _size;
        this.sca=new CVec3(1,1,1);
        this.UpdateRadius();
	}
    private UpdateRadius() {
        let scaledSize : CVec3;
        if(this.sca)
            scaledSize = CMath.V3MulV3(CMath.V3MulFloat(this.size,0.5), this.sca);
        else
            scaledSize = CMath.V3MulFloat(this.size,0.5);
        
        scaledSize.x = Math.abs(scaledSize.x);
        scaledSize.y = Math.abs(scaledSize.y);
        if(this.size.z==0)
            scaledSize.z=0;
        else
            scaledSize.z = Math.abs(scaledSize.z);

        this.r = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
        // this.r = CMath.V3Len(scaledSize);
        this.r += Math.random()*0.001;
    }
    SetMatrix(_mat : CMat)
    {
        super.SetMatrix(_mat);
        CMath.MatDecomposeSca(this.modelMatrix,this.sca);
        this.UpdateRadius();
    }
    SetMatrixDown(_mat : CMat,_pos : CVec3)
    {
		super.SetMatrixDown(_mat,_pos);
        CMath.MatDecomposeSca(this.modelMatrix,this.sca);
        this.UpdateRadius();
    }
    GetRadian()
    {
        return this.r;
    }
    getFarthestPointInDirection(v): CVec3
    {
        CMath.V3Nor(v,this.dirPoint);
        CMath.V3MulFloat(this.dirPoint, this.r,this.dirPoint);
    	CMath.V3AddV3(this.dirPoint, this.modelMatrix.xyz,this.dirPoint);
        return this.dirPoint;
    }
};
export class CGJKBox extends CGJKShape
{
	private min : CVec3;
	private max : CVec3;
    
    //private dirRes : CVec3;
	
	constructor(_min=new CVec3(),_max=new CVec3())
    {
    	super();
        this.min = _min.Export();
        this.max = _max.Export();

        this.min.x-=Math.random()*0.00001;
        this.max.x+=Math.random()*0.00001;

        this.min.y-=Math.random()*0.00001;
        this.max.y+=Math.random()*0.00001;

        this.min.z-=Math.random()*0.00001;
        this.max.z+=Math.random()*0.00001;
        
    }
    SetMatrix(_mat : CMat)
    {
        super.SetMatrix(_mat);
        if(_mat.IsRotUnit()==false)
            CMath.MatInvert(this.modelMatrix,this.inversMatrix);
	
    }
    SetMatrixDown(_mat : CMat,_pos : CVec3)
    {
        super.SetMatrixDown(_mat,_pos);
        if(this.inversMatrix.IsRotUnit())
            this.inversMatrix.Unit();
        else
            CMath.MatInvert(this.modelMatrix,this.inversMatrix);
    }
    getFarthestPointInDirection(v)
    {
        let vNor=CPoolGeo.ProductV3();
        
    	CMath.V3MulMatNormal(v, this.inversMatrix,this.dirPoint);
        vNor.mF32A[0] = (this.dirPoint.mF32A[0] > 0) ? this.max.mF32A[0] : this.min.mF32A[0];
        vNor.mF32A[1] = (this.dirPoint.mF32A[1] > 0) ? this.max.mF32A[1] : this.min.mF32A[1];
        vNor.mF32A[2] = (this.dirPoint.mF32A[2] > 0) ? this.max.mF32A[2] : this.min.mF32A[2];
        CMath.V3MulMatCoordi(vNor, this.modelMatrix,this.dirPoint);
        CPoolGeo.RecycleV3(vNor);
        return this.dirPoint;
    }
};
export class CGJKPolytope extends CGJKShape
{
	private vertices : CArray<CVec3>;
	constructor(_vertices=new CArray<CVec3>())
	{
		super();
        this.vertices=_vertices;
		//this.vertices.concat(_vertices);
	}
    SetMatrix(_mat : CMat)
    {
        super.SetMatrix(_mat);
        if(_mat.IsRotUnit()==false)
            CMath.MatInvert(this.modelMatrix,this.inversMatrix);
	
    }
    SetMatrixDown(_mat : CMat,_pos : CVec3)
    {
        super.SetMatrixDown(_mat,_pos);
        if(this.inversMatrix.IsRotUnit())
            this.inversMatrix.Unit();
        else
            CMath.MatInvert(this.modelMatrix,this.inversMatrix);
    }
    getFarthestPointInDirection(v)
    {
    	var dir = CMath.V3MulMatNormal(v, this.inversMatrix);
        var furthest_point=new CVec3();
        if(this.vertices.Size()!=0)
	        furthest_point = this.vertices.Find(0);
	    var max_dot = CMath.V3Dot(furthest_point, dir);

	    for (var i = 1; i < this.vertices.Size(); i++) {
	    	
	        var d = CMath.V3Dot(this.vertices.Find(i), dir);
	        if (d > max_dot) {
	            max_dot = d;
	            furthest_point = this.vertices.Find(i);
	        }
	    }
        CMath.V3MulMatCoordi(furthest_point, this.modelMatrix,this.dirPoint);
	    return  this.dirPoint;//convert support to world space
    }
};
var MAX_ITERATIONS = 30;
var EPA_TOLERANCE =0.0001;
var EPA_MAX_NUM_FACES =64;
var EPA_MAX_NUM_LOOSE_EDGES =32;
var EPA_MAX_NUM_ITERATIONS =64;
export class CGJK_EPA
{
	public m_n : number;
	public m_a : CVec3;
	public m_v : CVec3;
	public m_b : CVec3;
	public m_c : CVec3;
	public m_d : CVec3;
    public m_tmp : CVec3;


    public m_ao : CVec3;
    public m_ab : CVec3;
    public m_ac : CVec3;
    public m_ad : CVec3;

    public m_abc : CVec3;
    public m_abp : CVec3;
    public m_acp : CVec3;
    public m_acd : CVec3;
    public m_adb : CVec3;
    
	
    
	constructor()
	{
		this.m_n=0; //simplex size
	    this.m_a=new CVec3();
	    this.m_v=new CVec3();
	    this.m_b=new CVec3();
	    this.m_c=new CVec3();
	    this.m_d=new CVec3();

        this.m_tmp=new CVec3();

        this.m_ao=new CVec3();
        this.m_ab=new CVec3();
        this.m_ac=new CVec3();
        this.m_ad=new CVec3();

        this.m_abc=new CVec3();
        this.m_abp=new CVec3();
        this.m_acp=new CVec3();
        this.m_acd=new CVec3();
        this.m_adb=new CVec3();

	}
 
    Intersect(shape1 : CGJKShape,shape2 : CGJKShape) : boolean    {	    return true;	}
    support(shape1 : CGJKShape,shape2 : CGJKShape,_v : CVec3,p3 : CVec3=null)
    {
	    //v = CMath.V3Nor(v);
	    var p1 = shape1.getFarthestPointInDirection(_v);
        CMath.V3MulFloat(_v, -1,this.m_tmp);
	    var p2 = shape2.getFarthestPointInDirection(this.m_tmp);//negate v
        if(p3==null)
            p3=new CVec3();
	    CMath.V3SubV3(p1, p2,p3);
	    return p3;
	}
    update(_a) : boolean    {   return true;    }

    tripleProduct(ab,c,r) 
    {
        let vc=CPoolGeo.ProductV3();
        CMath.V3Cross(ab, c,vc);
        CMath.V3Cross(vc, ab,r);
        CPoolGeo.RecycleV3(vc);
    }

    checkOneFaceAC(abc,ac, ao) 
    {
        if (CMath.V3Dot(CMath.V3Cross(abc, ac), ao) > 0) {
            //origin is in the region of edge ac
            this.m_b = CMath.V3MulFloat(ao, -1);//b=a
            this.tripleProduct(ac, ao,this.m_v);
            this.m_n = 2;

            return false;
        }
        return true;
    }
    checkOneFaceAB(abc, ab, ao) 
    {
        if (CMath.V3Dot(CMath.V3Cross(ab, abc), ao) > 0) 
        {
            //origin in the region of edge ab
            this.m_c.Import(this.m_b);
            CMath.V3MulFloat(ao, -1,this.m_b);//b=a
            this.tripleProduct(ab, ao,this.m_v);
            this.m_n = 2;

            return false;
        }
        return true;
    }

    checkTwoFaces( abc, acd, ac,  ab,  ad,  ao) 
    {
        if (CMath.V3Dot(CMath.V3Cross(abc, ac), ao) > 0) {
            this.m_b = this.m_c;
            this.m_c = this.m_d;
            ab = ac;
            ac = ad;

            abc = acd;
            return false;
        }
        return true;
    }

    //Expanding Polytope Algorithm
    //Find minimum translation vector to resolve collision
    
    EPA(coll1 : CGJKShape,coll2 : CGJKShape) : CVec3  {      return null;    }
};
import CGJK_EPA_imple from "../geometry_imple/CGJK_EPA.js";

CGJK_EPA_imple();


