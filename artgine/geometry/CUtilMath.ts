import { CConsol } from "../basic/CConsol.js";
import {CWASM} from "../basic/CWASM.js";
import {CBound} from "./CBound.js";
import {CMat} from "./CMat.js";
import {CMath} from "./CMath.js";
import {CPlane} from "./CPlane.js";
import {CPlaneInside} from "./CPlaneInside.js";
import {CPoolGeo} from "./CPoolGeo.js";
import {CVec3} from "./CVec3.js";
import {CVec4} from "./CVec4.js";
const RayBoxRIGHT = 0;
const RayBoxLEFT = 1;
const RayBoxMIDDLE = 2;
const d_EPSILON = 1e-6;
export class CUtilMath
{
    
    static CameraPerspectiveFovLH(fov, aspect, znear, zfar,_width) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (zfar - znear);
        var result = new CMat();
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = -q * znear;
        return result;
    }
    static CameraPerspectiveFovRH(fov, aspect, znear, zfar,_width) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (znear-zfar);
        var result = new CMat();
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        
        result.mF32A[10] = q;
        result.mF32A[11] = -1.0;
        result.mF32A[14] = q * znear;
        return result;
    }

    static CameraOrthoLH(width, height, zn, zf)	//직교투영
    {
        var projMat=new CMat();
        projMat.SetUnit(false);
        projMat.mF32A[0] = 2 / width; projMat.mF32A[1] = 0; projMat.mF32A[2] = 0; projMat.mF32A[3] = 0;
        projMat.mF32A[4] = 0; projMat.mF32A[5] = 2 / height; projMat.mF32A[6] = 0; projMat.mF32A[7] = 0;
        projMat.mF32A[8] = 0; projMat.mF32A[9] = 0; projMat.mF32A[10] = 1 / (zf - zn); projMat.mF32A[11] = 0;
        projMat.mF32A[12] = 0; projMat.mF32A[13] = 0; projMat.mF32A[14] = -zn / (zf - zn); projMat.mF32A[15] = 1;
    
        return projMat;
    }
    static CameraOrthoRH(width, height, zn, zf)	//직교투영
    {
        var projMat=new CMat();
        projMat.SetUnit(false);
        projMat.mF32A[0] = 2 / width; projMat.mF32A[1] = 0; projMat.mF32A[2] = 0; projMat.mF32A[3] = 0;
        projMat.mF32A[4] = 0; projMat.mF32A[5] = 2 / height; projMat.mF32A[6] = 0; projMat.mF32A[7] = 0;
        projMat.mF32A[8] = 0; projMat.mF32A[9] = 0; projMat.mF32A[10] = 1 / (zn - zf); projMat.mF32A[11] = 0;
        projMat.mF32A[12] = 0; projMat.mF32A[13] = 0; projMat.mF32A[14] = zn / (zn - zf); projMat.mF32A[15] = 1;
    
        return projMat;
    }
    static CameraLookAtLH(eyeVec : CVec3,lookVec : CVec3,upVec : CVec3,viewMat=new CMat())	//뷰행렬생성
    {
        
        viewMat.SetUnit(false);
        var Zaxis = CMath.V3SubV3(lookVec, eyeVec);
        Zaxis=CMath.V3Nor(Zaxis);
        var Xaxis=new CVec3();
        Xaxis=CMath.V3Cross(upVec, Zaxis);
        if (Xaxis.IsZero())
        {
            Xaxis=new CVec3(1,0,0);
        }
        
            //CMsg.E("CameraLookAtLH error");//카메라 위치를 바꿔라!
        Xaxis=CMath.V3Nor(Xaxis);
        var Yaxis=new CVec3();
        Yaxis=CMath.V3Cross(Zaxis, Xaxis);
        viewMat.mF32A[0] = Xaxis.x; viewMat.mF32A[1] = Yaxis.x; viewMat.mF32A[2] = Zaxis.x; viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y; viewMat.mF32A[5] = Yaxis.y; viewMat.mF32A[6] = Zaxis.y; viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z; viewMat.mF32A[9] = Yaxis.z; viewMat.mF32A[10] = Zaxis.z; viewMat.mF32A[11] = 0;
    
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
    
        return viewMat;
    }
    static CameraLookAtRH(eyeVec : CVec3,lookVec : CVec3,upVec : CVec3,viewMat=new CMat())	//뷰행렬생성
    {
        
        viewMat.SetUnit(false);
        var Zaxis = CMath.V3SubV3(eyeVec,lookVec);
        Zaxis=CMath.V3Nor(Zaxis);
        var Xaxis=new CVec3();
        Xaxis=CMath.V3Cross(upVec, Zaxis);
        if (Xaxis.IsZero())
        {
            Xaxis=new CVec3(1,0,0);
        }
        
            //CMsg.E("CameraLookAtLH error");//카메라 위치를 바꿔라!
        Xaxis=CMath.V3Nor(Xaxis);
        var Yaxis=new CVec3();
        Yaxis=CMath.V3Cross(Zaxis, Xaxis);
        viewMat.mF32A[0] = Xaxis.x; viewMat.mF32A[1] = Yaxis.x; viewMat.mF32A[2] = Zaxis.x; viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y; viewMat.mF32A[5] = Yaxis.y; viewMat.mF32A[6] = Zaxis.y; viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z; viewMat.mF32A[9] = Yaxis.z; viewMat.mF32A[10] = Zaxis.z; viewMat.mF32A[11] = 0;
    
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
    
        return viewMat;
    }
    static RayTriangleIS(pa_one,pa_two,pa_three, pa_ray,pa_ccw=true)//IS -> Intersection
    {
        var pvec=new CVec3();
        var tvec=new CVec3();
        var qvec=new CVec3();
        var det=0,u=0,v=0,dist=0;
        var edge1=CMath.V3SubV3(pa_two, pa_one);
        var edge2=CMath.V3SubV3(pa_three, pa_one);
    
        var L_dir=CMath.V3SubV3(pa_ray.GetOriginal(), pa_one);
        if (L_dir.x == 0 && L_dir.y == 0 && L_dir.z == 0)
        {
            return true;
        }
        else
        {
            CMath.V3Nor(L_dir,L_dir);
            det = CMath.V3Dot(L_dir, CMath.V3MulFloat(pa_ray.GetDirect(), -1));
            if (det < 0 && pa_ccw)
            {
    
                return false;
            }
        }
        CMath.V3Cross(pa_ray.GetDirect(), edge2,pvec);
        det = CMath.V3Dot(edge1, pvec);
        if (det > 0)
        {
            CMath.V3SubV3(pa_ray.GetOriginal(), pa_one,tvec);
        }
        else//이부분 에서 컬링 설정을 할수 있다!
        {
            CMath.V3SubV3(pa_one, pa_ray.GetOriginal(),tvec);
            det = -det;
            //L_back=true;
            if (pa_ccw)
            {
                return false;
            }
        }
    
    
        if (det < 0.000001)
        {
            return false;
        }
    
        u = CMath.V3Dot(tvec, pvec);
        if (u < 0.0 || u > det)
        {
            return false;
        }
    
        CMath.V3Cross(tvec, edge1,qvec);
        v = CMath.V3Dot(pa_ray.GetDirect(), qvec);
        if (v < 0.0 || u + v > det)
        {
            return false;
        }
    
        dist = CMath.V3Dot(edge2, qvec);
        dist *= (1.0 / det);
        //*pa_dist = dist;
        
        var sum=CMath.V3MulFloat(pa_ray.GetDirect(), dist);
        CMath.V3AddV3(pa_ray.GetOriginal(),sum,sum);
        pa_ray.SetPosition(sum);
        
        return true;
    }
    static RayBoxIS(_min,_max,pa_ray)
    {
        var inside = true;
        var quadrant = [0,0,0];
        var i;
        var whichPlane;
        var maxT = [0,0,0];
        var candidatePlane = [0,0,0];
        
        var vecList=pa_ray.GetVecList();
        var pOrigin = [ vecList[2].x ,vecList[2].y ,vecList[2].z ];
        var pBoxMin = [ _min.x,_min.y,_min.z ];
        var pBoxMax = [ _max.x,_max.y,_max.z ];
        
        if(pBoxMin[0]>pBoxMax[0])
        {
            pBoxMin[0]=_max.x;
            pBoxMax[0]=_min.x;
        }
        if(pBoxMin[1]>pBoxMax[1])
        {
            pBoxMin[1]=_max.y;
            pBoxMax[1]=_min.y;
        }
        if(pBoxMin[2]>pBoxMax[2])
        {
            pBoxMin[2]=_max.z;
            pBoxMax[2]=_min.z;
        }
        
        var pDir = [ vecList[0].x ,vecList[0].y ,vecList[0].z ];
        var pIntersect = [ 0 ,0 ,0 ];
    
        //박스 1개의 축씩 넘는지 안인지 체크한다
        //켄디데이타에 최소,최대 거리를 넣는다
        for (i = 0; i < 3; ++i)
        {
            if (pOrigin[i] < pBoxMin[i])
            {
                quadrant[i] = RayBoxLEFT;
                candidatePlane[i] = pBoxMin[i];
                inside = false;
            }
            else if (pOrigin[i] > pBoxMax[i])
            {
                quadrant[i] = RayBoxRIGHT;
                candidatePlane[i] = pBoxMax[i];
                inside = false;
            }
            else
            {
                quadrant[i] = RayBoxMIDDLE;
            }
        }
    
        //셋다 안이면 내부이다
        if (inside)
        {
            //충돌지점은 자신으로 표현
            pa_ray.SetPosition(new CVec3(pOrigin[0], pOrigin[1], pOrigin[2]));
    
            //*t = 0.0f;
            return true;
        }
    
    
        // Calculate T distances to candidate planes
        for (i = 0; i < 3; i++)
        {
            //중심이아니였음 그리고 너무 작은수는 패스
            if (quadrant[i] != RayBoxMIDDLE
                && (pDir[i] > d_EPSILON || pDir[i] < -d_EPSILON))
            {
                //(맥시멈-현재위치)/기울기
                maxT[i] = (candidatePlane[i] - pOrigin[i]) / pDir[i];
            }
            //아니면 직각이기때문에 -1
            else
            {
                maxT[i] = -1.0;
            }
        }
    
        //가장 큰값 찾고
        whichPlane = 0;
        for (i = 1; i < 3; i++)
        {
            if (maxT[whichPlane] < maxT[i])
                whichPlane = i;
        }
    
        // 0보다 작으면 충돌 아닌상황
        if (maxT[whichPlane] < 0.0)
        {
            return false;
        }
    
    
        for (i = 0; i < 3; i++)
        {
            //가장 큰값이 아닌경우
            if (whichPlane != i)
            {
                //충돌지점 구하고
                pIntersect[i] = pOrigin[i] + maxT[whichPlane] * pDir[i];
                //민,맥스랑 비교후 넘어가는 경우도 패스
                if (pIntersect[i] < pBoxMin[i] || pIntersect[i] > pBoxMax[i])
                {
                    return false;
                }
            }
            else
            {
                //
                pIntersect[i] = candidatePlane[i];
            }
        }
        pa_ray.SetPosition(new CVec3(pIntersect[0], pIntersect[1], pIntersect[2]));
        return true;
    }
    static RaySphereIS(pa_center, pa_radian,pa_ray)
    {
        var l = CMath.V3SubV3(pa_center, pa_ray.GetOriginal());
        var s = CMath.V3Dot(l, CMath.V3Nor(pa_ray.GetDirect()));
    
    
        var l2 = CMath.V3Dot(l, l);
        var r2 = Math.pow(pa_radian, 2);
    
        if (s < 0 && l2 > r2)  //각도가 아예 다른 방향이고 반지름이 더 크다는건 내부에 없다는 의미
        {
            return false;					   // 광선이 구의 반대 방향을 향하거나 구를 지나친 경우
        }
        var s2 = Math.pow(s, 2);
        var m2 = l2 - s2;
    
        if (m2 > r2)
        {
            return false;					  // 광선이 구를 비껴가는 경우
        }
    
        var q = Math.sqrt(r2 - m2);
        var distance;
    
        //// 두 개의 교차점 중 어느것을 구하는가?   
        if (l2 > r2)
        {
            distance = s - q;
        }
        else
        {
            distance = s + q;
        }
    
        pa_ray.SetPosition(CMath.V3AddV3(pa_ray.GetOriginal(), CMath.V3MulFloat(pa_ray.GetDirect(), distance)));
    
        return true;
    }
    static ColSphereSphere(_posA : CVec3, _radiusA : number,_posB : CVec3,_radiusB: number)
    {
        var vlen = CMath.V3Len(CMath.V3SubV3(_posA, _posB));
        if (vlen <= _radiusA + _radiusB)
            return vlen;
        return -1;
    }
    
    static PlaneSphereInside(pa_plane : CPlane,pa_posion : CVec3, pa_radius : number,_pArr : Array<CPlaneInside>)
    {
        if(pa_plane.Ptr()!=null && pa_posion.Ptr()!=null && _pArr==null)
            return CWASM.PlaneSphereInside(pa_plane.Ptr(), pa_posion.Ptr(), pa_radius);
        
        var L_dist = 0;
        
        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Left, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist < pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Left,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Right, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist < pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Right,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Bottom, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Bottom,-L_dist/pa_radius));
        }
        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Top, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Top,-L_dist/pa_radius));
        }
        
        
    
        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Near, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Near,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneVec3DotCoordinate(pa_plane,CPlane.eDir.Far, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Far,-L_dist/pa_radius));
        }
        
        

        return true;
    }
    //1엣지 리스트2현재 위치(0~1),3활용 엣지 범위 베이지어 위아래 당긴정도
    static Bezier(pa_vec : Array<any>,pa_persent,_rangeX,_rangeY)
    {
        var k=0, kn=0, nn=0, nkn=0;
        var n = pa_vec.length - 1;
        var blend=0, muk=0, munk=0;
        var pa_pst=null;
        
        if(pa_vec[0] instanceof CVec3)
        {
            pa_pst=new CVec3();
            var b=new CVec3();
            if (pa_persent == 1.0)
            {
                pa_pst = pa_vec[pa_vec.length-1];
                return pa_pst;
            }
            if (_rangeY == 0)
            {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
    
            muk = 1;
    
            munk = Math.pow(1.0 - pa_persent, n);
    
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++)
            {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1)
                {
                    blend *= nn;
                    nn--;
    
                    if (kn > 1)
                    {
                        blend /= kn;
                        kn--;
                    }
    
                    if (nkn > 1)
                    {
                        blend /= nkn;
                        nkn--;
                    }
                }
    
                b.x += (pa_vec[k].x * blend);
                b.y += (pa_vec[k].y * blend);
                b.z += (pa_vec[k].z * blend);
            }
    
            pa_pst = b;
        }
        else
        {
            pa_pst=0;
            var bb=0;
            if (pa_persent == 1.0)
            {
                pa_pst = pa_vec[pa_vec.length-1];
                return pa_pst;
            }
            if (_rangeY == 0)
            {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
    
            muk = 1;
    
            munk = Math.pow(1.0 - pa_persent, n);
    
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++)
            {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1)
                {
                    blend *= nn;
                    nn--;
    
                    if (kn > 1)
                    {
                        blend /= kn;
                        kn--;
                    }
    
                    if (nkn > 1)
                    {
                        blend /= nkn;
                        nkn--;
                    }
                }
    
                bb += (pa_vec[k] * blend);
                
            }
    
            pa_pst = bb;
        }
        
    
        
        return pa_pst;
    }
    static Vec3ToBillboard(RF_axis,_st,_ed,_eye)
    {
    
        var t0=new CVec3();
        var t1=new CVec3();
        var t2=new CVec3();
        
        CMath.V3SubV3(_st,_ed,t0);
        CMath.V3SubV3(_eye,_st,t1);
        if (_ed.equals(_st))
            _st = new CVec3(0, 1, 0);
        CMath.V3Nor(t0,t0);
        CMath.V3Nor(t1,t1);
        CMath.V3Cross(t0, t1,t2);
        CMath.V3Nor(t2,t2);
        
        RF_axis.x=t2.x;
        RF_axis.y=t2.y;
        RF_axis.z=t2.z;
    }
    //https://threejs.org/examples/webgl_math_obb.html
	static ColSphereBox(_posA : CVec3, _radiusA : number,_boundB : CBound,_matB : CMat)
	{
		let xAxis = new CVec3();
		let yAxis = new CVec3();
		let zAxis = new CVec3();
		//박스의 로컬 좌표계의 축을 구함
		xAxis.mF32A[0] = _matB.mF32A[0];
		xAxis.mF32A[1] = _matB.mF32A[1];
		xAxis.mF32A[2] = _matB.mF32A[2];
		yAxis.mF32A[0] = _matB.mF32A[4];
		yAxis.mF32A[1] = _matB.mF32A[5];
		yAxis.mF32A[2] = _matB.mF32A[6];
		zAxis.mF32A[0] = _matB.mF32A[8];
		zAxis.mF32A[1] = _matB.mF32A[9];
		zAxis.mF32A[2] = _matB.mF32A[10];
		//박스의 스케일
		let scaX = CMath.V3Len(xAxis);
		let scaY = CMath.V3Len(yAxis);
		let scaZ = CMath.V3Len(zAxis);
		//박스의 로컬 좌표계의 축을 정규화
		CMath.V3Nor(xAxis, xAxis);
		CMath.V3Nor(yAxis, yAxis);
		CMath.V3Nor(zAxis, zAxis);
		//박스의 중심
		let center = new CVec3(_matB.mF32A[12], _matB.mF32A[13], _matB.mF32A[14]);
		//구의 중심과 박스의 중심 사이의 벡터
		let vec = new CVec3();
		CMath.V3SubV3(_posA, center, vec);
		//박스의 크기의 절반
		let halfSize = new CVec3();
		_boundB.GetSize(halfSize);
		CMath.V3MulV3(halfSize, new CVec3(0.5 * scaX, 0.5 * scaY, 0.5 * scaZ), halfSize);
		//구의 중심과 박스의 중심 사이의 벡터를 박스의 로컬 좌표계로 변환
		let x = CMath.Max(CMath.Min(CMath.V3Dot(vec, xAxis), halfSize.mF32A[0]), -halfSize.mF32A[0]);
		let y = CMath.Max(CMath.Min(CMath.V3Dot(vec, yAxis), halfSize.mF32A[1]), -halfSize.mF32A[1]);
		let z = CMath.Max(CMath.Min(CMath.V3Dot(vec, zAxis), halfSize.mF32A[2]), -halfSize.mF32A[2]);
		//박스의 로컬 좌표계에서 구의 중심으로 가는 가장 가까운 점
		let closestPoint = center;
		CMath.V3AddV3(closestPoint, CMath.V3MulFloat(xAxis, x), closestPoint);
		CMath.V3AddV3(closestPoint, CMath.V3MulFloat(yAxis, y), closestPoint);
		CMath.V3AddV3(closestPoint, CMath.V3MulFloat(zAxis, z), closestPoint);
		//가장 가까운 점과 구의 중심 사이의 거리의 제곱
		CMath.V3SubV3(_posA, closestPoint, vec);
			//가장 가까운 점과 구의 중심 사이의 거리
		let distance = CMath.V3Len(vec);
		if(distance >= _radiusA) {
			return null;
		}
		//침투 깊이
		let penetrationDepth = _radiusA - distance;
		//충돌 법선
		let collisionNormal = CMath.V3SubV3(_posA, closestPoint);
		//만약 충돌 법선의 길이가 0이면 박스의 중심과 구의 중심이 같음
		if(collisionNormal.IsZero()) {
			collisionNormal = xAxis;
		}
		CMath.V3Nor(collisionNormal, collisionNormal);
		//충돌 해결을 위한 벡터
		let resultVec = CMath.V3MulFloat(collisionNormal, penetrationDepth);
		return resultVec;
	}
	
	// static ColBoxBoxOBB(_boundA : CBound,_matA : CMat,_boundB : CBound,_matB : CMat,_push : CVec3=null)
	// {
	// 	//let L_center=[];
	// 	let aCen=CPoolGeo.ProductV3();
	// 	let bCen=CPoolGeo.ProductV3();
	// 	//let L_dir=[[],[]];
	// 	let aDir=[CPoolGeo.ProductV3(),CPoolGeo.ProductV3(),CPoolGeo.ProductV3()];
	// 	let bDir=[CPoolGeo.ProductV3(),CPoolGeo.ProductV3(),CPoolGeo.ProductV3()];
	// 	let aLen=CPoolGeo.ProductV3();
	// 	let bLen=CPoolGeo.ProductV3();
	// 	let atob=CPoolGeo.ProductV3();
	
	// 	let URenturn=()=>{
    //         CPoolGeo.RecycleV3(aCen);
    //         CPoolGeo.RecycleV3(bCen);
    //         CPoolGeo.RecycleV3(aLen);
    //         CPoolGeo.RecycleV3(bLen);

    //         CPoolGeo.RecycleV3(aDir[0]);
    //         CPoolGeo.RecycleV3(aDir[1]);
    //         CPoolGeo.RecycleV3(aDir[2]);
    //         CPoolGeo.RecycleV3(bDir[0]);
    //         CPoolGeo.RecycleV3(bDir[1]);
    //         CPoolGeo.RecycleV3(bDir[2]);
    //         CPoolGeo.RecycleV3(atob);
            
	// 		return null;
	// 	};

	// 	_matA.GetV3(0,aDir[0]);
	// 	_matA.GetV3(1,aDir[1]);
	// 	_matA.GetV3(2,aDir[2]);

	// 	_matB.GetV3(0,bDir[0]);
	// 	_matB.GetV3(1,bDir[1]);
	// 	_matB.GetV3(2,bDir[2]);

	
	// 	_matA.GetV3(3,aCen);
	// 	_matB.GetV3(3,bCen);
		
	
		
	
	// 	_boundA.GetSize(aLen);
	// 	_boundB.GetSize(bLen);
	// 	CMath.V3MulFloat(aLen,0.5,aLen);
	// 	CMath.V3MulFloat(bLen,0.5,bLen);
	


		

	// 	aLen.x *= CMath.V3Len(aDir[0]);
	// 	aLen.y *= CMath.V3Len(aDir[1]);
	// 	aLen.z *= CMath.V3Len(aDir[2]);
	// 	bLen.x *= CMath.V3Len(bDir[0]);
	// 	bLen.y *= CMath.V3Len(bDir[1]);
	// 	bLen.z *= CMath.V3Len(bDir[2]);


	// 	CMath.V3Nor(aDir[0],aDir[0]);
	// 	CMath.V3Nor(aDir[1],aDir[1]);
	// 	CMath.V3Nor(aDir[2],aDir[2]);

	// 	CMath.V3Nor(bDir[0],bDir[0]);
	// 	CMath.V3Nor(bDir[1],bDir[1]);
	// 	CMath.V3Nor(bDir[2],bDir[2]);
	
	// 	//XZ는 -1~1  Y는 0~2단위라서 절반하면 절반만큼 오차가 생긴다
	// 	//그부분 수정용
	// 	//L_center[0].y+=(pa_A.max.y*L_rLen[0].y)-aLen.y;
	// 	//L_center[1].y+=(pa_B.max.y*L_rLen[1].y)-bLen.y;
	
	// 	//var L_diff=[new CVec3(),new CVec3()];;
	// 	let aDiff=CPoolGeo.ProductV3();
	// 	let bDiff=CPoolGeo.ProductV3();
	// 	let diffDum=CPoolGeo.ProductV3();
	// 	CMath.V3AddV3(_boundA.mMax , _boundA.mMin,aDiff);
	// 	CMath.V3MulFloat(aDiff,0.5,aDiff);
	// 	CMath.V3AddV3(_boundB.mMax , _boundB.mMin,bDiff);
	// 	CMath.V3MulFloat(bDiff,0.5,bDiff);
	// 	//CMath.V3MulFloat(CMath.V3AddV3(_boundA.max , _boundA.min),0.5,L_diff[0]);
	// 	//CMath.V3MulFloat(CMath.V3AddV3(_boundB.max , _boundB.min),0.5,L_diff[1]);
	
	// 	CMath.V3MulMatNormal(aDiff, _matA,diffDum);
	// 	CMath.V3AddV3(aCen, diffDum,aCen);
	// 	CMath.V3MulMatNormal(bDiff, _matB,diffDum);
	// 	CMath.V3AddV3(bCen, diffDum,bCen);
    //     CPoolGeo.RecycleV3(aDiff);
    //     CPoolGeo.RecycleV3(bDiff);
    //     CPoolGeo.RecycleV3(diffDum);
		
	// 	// L_diff[1] = CMath.V3MulMatNormal(L_diff[1], _matB);
	
	// 	// CMath.V3AddV3(aCen, L_diff[0],aCen);
	// 	// CMath.V3AddV3(bCen, L_diff[1],bCen);
	
	
	
	// 	// 여기서 R0 항목은 OBB A의 interval radius, R1 항목은 OBB B의 interval radius, R 항목은 2개의 OBB의 중심 간의 투영된 거리를 나타낸다.
	// 	// D 벡터는 2개의 OBB의 중심을 잇는 벡터를 나타낸다.
	// 	// Cij 는 rotation matrix R에서의 (i,j) 항을 나타낸다.
	// 	var c=[[0,0,0],[0,0,0],[0,0,0]];
	// 	var absC=[[0,0,0],[0,0,0],[0,0,0]];
	// 	var d=[0,0,0];
	// 	var p=[0,0,0];
	// 	let pv=0;
	
	// 	var r0=0, r1=0, r=0;

	
	// 	CMath.V3SubV3(aCen,bCen,atob);
	// 	for ( let i = 0; i < 3; i ++ ) {

	// 		for ( let j = 0; j < 3; j ++ ) {

	// 			c[ i ][ j ] = CMath.V3Dot(aDir[i], bDir[j]);

	// 		}

	// 	}
	// 	let epsilon=2.220446049250313e-16;
	// 	for ( let i = 0; i < 3; i ++ ) 
	// 	{
	// 		for ( let j = 0; j < 3; j ++ ) 
	// 		{
	// 			absC[i][j] = CMath.Abs(c[i][j])+epsilon;
	// 		}

	// 	}

	// 	d[0] = CMath.V3Dot(atob, aDir[0]);
	// 	d[1] = CMath.V3Dot(atob, aDir[1]);
	// 	d[2] = CMath.V3Dot(atob, aDir[2]);

	// 	for ( let i = 0; i < 3; i ++ ) 
	// 	{
	// 		r = CMath.Abs(d[i]);
	// 		r0 = aLen.mF32A[i];//a.e[ i ];
	// 		r1 = bLen.mF32A[0] * absC[ i ][ 0 ] + bLen.mF32A[1] * absC[ i ][ 1 ] + bLen.mF32A[2] * absC[ i ][ 2 ];
	// 		if ( r > r0 + r1 ) return URenturn();
	// 		p[i]=r-(r0 + r1);
	// 	}
	// 	for ( let i = 0; i < 3; i ++ ) {

	// 		r = CMath.Abs(d[ 0 ] * c[ 0 ][ i ] + d[ 1 ] * c[ 1 ][ i ] + d[ 2 ] * c[ 2 ][ i ]);
	// 		r0 = aLen.mF32A[ 0 ] * absC[ 0 ][ i ] + aLen.mF32A[1] * absC[ 1 ][ i ] + aLen.mF32A[2] * absC[ 2 ][ i ];
	// 		r1 = bLen.mF32A[i];
	// 		if ( r > r0 + r1 ) return URenturn();
	// 		pv=r-(r0 + r1);
	// 		if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0)
	// 			p[i]=pv*0.99999;//메인축이 선택될 확률이 높도록 조정함
	// 	}


			
	// 	let p2=[0,0,0,0,0,0,0,0,0];
	
	
	// 	r = CMath.Abs(d[2] * c[1][0] - d[1] * c[2][0]);
	// 	r0 = aLen.y * absC[2][0] + aLen.z * absC[1][0];
	// 	r1 = bLen.y * absC[0][2] + bLen.z * absC[0][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	//p2[0]=r-(r0 + r1);
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	
	// 	r = CMath.Abs(d[2] * c[1][1] - d[1] * c[2][1]);
	// 	r0 = aLen.y * absC[2][1] + aLen.z * absC[1][1];
	// 	r1 = bLen.x * absC[0][2] + bLen.z * absC[0][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	// 	r = CMath.Abs(d[2] * c[1][2] - d[1] * c[2][2]);
	// 	r0 = aLen.y * absC[2][2] + aLen.z * absC[1][2];
	// 	r1 = bLen.x * absC[0][1] + bLen.y * absC[0][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][0] - d[2] * c[0][0]);
	// 	r0 = aLen.x * absC[2][0] + aLen.z * absC[0][0];
	// 	r1 = bLen.y * absC[1][2] + bLen.z * absC[1][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][1] - d[2] * c[0][1]);
	// 	r0 = aLen.x * absC[2][1] + aLen.z * absC[0][1];
	// 	r1 = bLen.x * absC[1][2] + bLen.z * absC[1][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][2] - d[2] * c[0][2]);
	// 	r0 = aLen.x * absC[2][2] + aLen.z * absC[0][2];
	// 	r1 = bLen.x * absC[1][1] + bLen.y * absC[1][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[1] * c[0][0] - d[0] * c[1][0]);
	// 	r0 = aLen.x * absC[1][0] + aLen.y * absC[0][0];
	// 	r1 = bLen.y * absC[2][2] + bLen.z * absC[2][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
	// 	r = CMath.Abs(d[1] * c[0][1] - d[0] * c[1][1]);
	// 	r0 = aLen.x * absC[1][1] + aLen.y * absC[0][1];
	// 	r1 = bLen.x * absC[2][2] + bLen.z * absC[2][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
	// 	r = CMath.Abs(d[1] * c[0][2] - d[0] * c[1][2]);
	// 	r0 = aLen.x * absC[1][2] + aLen.y * absC[0][2];
	// 	r1 = bLen.x * absC[2][1] + bLen.y * absC[2][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
		
	// 	let push=_push;
	// 	if(push==null)
	// 		push=new CVec3();
	// 	if(CMath.Abs(p[0])<CMath.Abs(p[1]))
	// 	{
	// 		if(CMath.Abs(p[0])<CMath.Abs(p[2]))
	// 			push.mF32A[0]=atob.mF32A[0]<0?-p[0]:p[0];
	// 		else
	// 			push.mF32A[2]=atob.mF32A[2]<0?-p[2]:p[2];
				
	// 	}
	// 	else
	// 	{
	// 		if(CMath.Abs(p[1])<CMath.Abs(p[2]))
	// 			push.mF32A[1]=atob.mF32A[1]<0?-p[1]:p[1];
	// 		else
	// 			push.mF32A[2]=atob.mF32A[2]<0?-p[2]:p[2];
	// 	}
	// 	URenturn();
	// 	return push;
	// }

    //1차 그나마 보기 쉬운 버전
    static ColBoxBoxOBB(_boundA: CBound, _matA: CMat, _boundB: CBound, _matB: CMat, _push: CVec3 = null): CVec3 | null
    {
        // ---- 1) POOL: 임시 벡터 준비 ----
        const a = {
            center: CPoolGeo.ProductV3(),
            axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
            extents: CPoolGeo.ProductV3(),
            tmp: CPoolGeo.ProductV3(),
        };
        const b = {
            center: CPoolGeo.ProductV3(),
            axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
            extents: CPoolGeo.ProductV3(),
            tmp: CPoolGeo.ProductV3(),
        };
        const t      = CPoolGeo.ProductV3(); // A->B 중심 벡터
        const bestAx = CPoolGeo.ProductV3(); // 최종 MTV 축(단위)
        const cross  = CPoolGeo.ProductV3(); // 교차축 재사용
        const mtv    = CPoolGeo.ProductV3(); // 결과 MTV
        const mtvAxW = CPoolGeo.ProductV3(); // 부호 조정용(재사용)

        const ReturnFun = () => {
            // recycle A
            CPoolGeo.RecycleV3(a.center);
            CPoolGeo.RecycleV3(a.axes[0]); CPoolGeo.RecycleV3(a.axes[1]); CPoolGeo.RecycleV3(a.axes[2]);
            CPoolGeo.RecycleV3(a.extents);
            CPoolGeo.RecycleV3(a.tmp);
            // recycle B
            CPoolGeo.RecycleV3(b.center);
            CPoolGeo.RecycleV3(b.axes[0]); CPoolGeo.RecycleV3(b.axes[1]); CPoolGeo.RecycleV3(b.axes[2]);
            CPoolGeo.RecycleV3(b.extents);
            CPoolGeo.RecycleV3(b.tmp);
            // others
            CPoolGeo.RecycleV3(t);
            CPoolGeo.RecycleV3(bestAx);
            CPoolGeo.RecycleV3(cross);
            CPoolGeo.RecycleV3(mtv);
            CPoolGeo.RecycleV3(mtvAxW);
        };

        // ---- 2) A, B의 center/axes/extents 세팅 (스케일 흡수) ----
        // A center
        CMath.V3MulFloat(CMath.V3AddV3(_boundA.mMax, _boundA.mMin, a.tmp), 0.5, a.tmp);
        CMath.V3MulMatCoordi(a.tmp, _matA, a.center);

        _matA.GetV3(0, a.axes[0]);
        _matA.GetV3(1, a.axes[1]);
        _matA.GetV3(2, a.axes[2]);

        _boundA.GetSize(a.extents); // full size (local AABB)
        a.extents.x *= 0.5 * CMath.V3Len(a.axes[0]);
        a.extents.y *= 0.5 * CMath.V3Len(a.axes[1]);
        a.extents.z *= 0.5 * CMath.V3Len(a.axes[2]);
        CMath.V3Nor(a.axes[0], a.axes[0]); CMath.V3Nor(a.axes[1], a.axes[1]); CMath.V3Nor(a.axes[2], a.axes[2]);

        // B center
        CMath.V3MulFloat(CMath.V3AddV3(_boundB.mMax, _boundB.mMin, b.tmp), 0.5, b.tmp);
        CMath.V3MulMatCoordi(b.tmp, _matB, b.center);

        _matB.GetV3(0, b.axes[0]);
        _matB.GetV3(1, b.axes[1]);
        _matB.GetV3(2, b.axes[2]);

        _boundB.GetSize(b.extents);
        b.extents.x *= 0.5 * CMath.V3Len(b.axes[0]);
        b.extents.y *= 0.5 * CMath.V3Len(b.axes[1]);
        b.extents.z *= 0.5 * CMath.V3Len(b.axes[2]);
        CMath.V3Nor(b.axes[0], b.axes[0]); CMath.V3Nor(b.axes[1], b.axes[1]); CMath.V3Nor(b.axes[2], b.axes[2]);

        // A->B
        CMath.V3SubV3(b.center, a.center, t);

        // ---- 3) SAT 검사 ----
        let minOverlap = Infinity;
        const EPS2 = 1e-10; // 교차축 길이 제곱 임계

        // 헬퍼: 반지름(projection half-length) 계산
        const radiusOn = (ext: CVec3, ax0: CVec3, ax1: CVec3, ax2: CVec3, axis: CVec3) =>
            ext.x * Math.abs(CMath.V3Dot(axis, ax0)) +
            ext.y * Math.abs(CMath.V3Dot(axis, ax1)) +
            ext.z * Math.abs(CMath.V3Dot(axis, ax2));

        // 축 검사 공통 루틴
        const testAxis = (axis: CVec3): boolean => {
            // proj
            const ra = radiusOn(a.extents, a.axes[0], a.axes[1], a.axes[2], axis);
            const rb = radiusOn(b.extents, b.axes[0], b.axes[1], b.axes[2], axis);
            const dist = Math.abs(CMath.V3Dot(t, axis));
            const overlap = ra + rb - dist;

            if (overlap <= 0) return false; // 분리 발견 → 충돌 아님

            if (overlap < minOverlap) {
                minOverlap = overlap;
                // MTV 방향: A -> B 바깥쪽
                // mtvAxW = axis * sign(dot(t,axis))
                mtvAxW.Import(axis);
                
                if (CMath.V3Dot(t, mtvAxW) < 0) CMath.V3MulFloat(mtvAxW, -1, mtvAxW);
                bestAx.Import(mtvAxW);
            }
            return true;
        };

        // 3.1 A의 3축, B의 3축
        if (!testAxis(a.axes[0])) { ReturnFun(); return null; }
        if (!testAxis(a.axes[1])) { ReturnFun(); return null; }
        if (!testAxis(a.axes[2])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[0])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[1])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[2])) { ReturnFun(); return null; }

        // 3.2 교차축 9개 (즉시 계산/검사, 저장 없음)
        for (let i=0;i<3;i++){
            for (let j=0;j<3;j++){
                CMath.V3Cross(a.axes[i], b.axes[j], cross);
                // 거의 평행이면 스킵
                if (CMath.V3Dot(cross, cross) <= EPS2) continue;
                CMath.V3Nor(cross, cross);
                if (!testAxis(cross)) { ReturnFun(); return null; }
            }
        }

        // ---- 4) MTV 계산/반환 ----
        CMath.V3MulFloat(bestAx, minOverlap, mtv);

        const out = _push || new CVec3();
        out.Import(mtv);

        ReturnFun();
        return out;
    }

    // static ColBoxBoxOBB(_boundA: CBound, _matA: CMat, _boundB: CBound, _matB: CMat, _push: CVec3 = null): CVec3 | null
    // {
    //     // ---- 1) POOL: 임시 벡터 준비 ----
    //     const a = {
    //         center: CPoolGeo.ProductV3(),
    //         axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
    //         extents: CPoolGeo.ProductV3(),
    //         tmp: CPoolGeo.ProductV3(),
    //     };
    //     const b = {
    //         center: CPoolGeo.ProductV3(),
    //         axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
    //         extents: CPoolGeo.ProductV3(),
    //         tmp: CPoolGeo.ProductV3(),
    //     };
    //     const t      = CPoolGeo.ProductV3(); // A->B 중심 벡터
    //     const bestAx = CPoolGeo.ProductV3(); // 최종 MTV 축(단위)
    //     const cross  = CPoolGeo.ProductV3(); // 교차축 재사용
    //     const mtv    = CPoolGeo.ProductV3(); // 결과 MTV
    //     const mtvAxW = CPoolGeo.ProductV3(); // 부호 조정용(재사용)

    //     const ReturnFun = () => {
    //         // recycle A
    //         CPoolGeo.RecycleV3(a.center);
    //         CPoolGeo.RecycleV3(a.axes[0]); CPoolGeo.RecycleV3(a.axes[1]); CPoolGeo.RecycleV3(a.axes[2]);
    //         CPoolGeo.RecycleV3(a.extents);
    //         CPoolGeo.RecycleV3(a.tmp);
    //         // recycle B
    //         CPoolGeo.RecycleV3(b.center);
    //         CPoolGeo.RecycleV3(b.axes[0]); CPoolGeo.RecycleV3(b.axes[1]); CPoolGeo.RecycleV3(b.axes[2]);
    //         CPoolGeo.RecycleV3(b.extents);
    //         CPoolGeo.RecycleV3(b.tmp);
    //         // others
    //         CPoolGeo.RecycleV3(t);
    //         CPoolGeo.RecycleV3(bestAx);
    //         CPoolGeo.RecycleV3(cross);
    //         CPoolGeo.RecycleV3(mtv);
    //         CPoolGeo.RecycleV3(mtvAxW);
    //     };

    //     // ---- 2) A, B의 center/axes/extents 세팅 (스케일 흡수) ----
    //     // A center
    //     CMath.V3MulFloat(CMath.V3AddV3(_boundA.mMax, _boundA.mMin, a.tmp), 0.5, a.tmp);
    //     CMath.V3MulMatCoordi(a.tmp, _matA, a.center);

    //     _matA.GetV3(0, a.axes[0]);
    //     _matA.GetV3(1, a.axes[1]);
    //     _matA.GetV3(2, a.axes[2]);

    //     _boundA.GetSize(a.extents); // full size (local AABB)
    //     a.extents.x *= 0.5 * CMath.V3Len(a.axes[0]);
    //     a.extents.y *= 0.5 * CMath.V3Len(a.axes[1]);
    //     a.extents.z *= 0.5 * CMath.V3Len(a.axes[2]);
    //     CMath.V3Nor(a.axes[0], a.axes[0]); CMath.V3Nor(a.axes[1], a.axes[1]); CMath.V3Nor(a.axes[2], a.axes[2]);

    //     // B center
    //     CMath.V3MulFloat(CMath.V3AddV3(_boundB.mMax, _boundB.mMin, b.tmp), 0.5, b.tmp);
    //     CMath.V3MulMatCoordi(b.tmp, _matB, b.center);

    //     _matB.GetV3(0, b.axes[0]);
    //     _matB.GetV3(1, b.axes[1]);
    //     _matB.GetV3(2, b.axes[2]);

    //     _boundB.GetSize(b.extents);
    //     b.extents.x *= 0.5 * CMath.V3Len(b.axes[0]);
    //     b.extents.y *= 0.5 * CMath.V3Len(b.axes[1]);
    //     b.extents.z *= 0.5 * CMath.V3Len(b.axes[2]);
    //     CMath.V3Nor(b.axes[0], b.axes[0]); CMath.V3Nor(b.axes[1], b.axes[1]); CMath.V3Nor(b.axes[2], b.axes[2]);

    //     // A->B
    //     CMath.V3SubV3(b.center, a.center, t);

    //     // ---- 3) SAT 검사 ----
    //     let minOverlap = Infinity;
    //     const EPS2 = 1e-12; // 교차축 길이 제곱 임계

    //     // 헬퍼: 반지름(projection half-length) 계산
    //     const radiusOn = (ext: CVec3, ax0: CVec3, ax1: CVec3, ax2: CVec3, axis: CVec3) =>
    //         ext.x * Math.abs(CMath.V3Dot(axis, ax0)) +
    //         ext.y * Math.abs(CMath.V3Dot(axis, ax1)) +
    //         ext.z * Math.abs(CMath.V3Dot(axis, ax2));

    //     // 축 검사 공통 루틴
    //     const testAxis = (axis: CVec3): boolean => {
    //         // proj
    //         const ra = radiusOn(a.extents, a.axes[0], a.axes[1], a.axes[2], axis);
    //         const rb = radiusOn(b.extents, b.axes[0], b.axes[1], b.axes[2], axis);
    //         const dist = Math.abs(CMath.V3Dot(t, axis));
    //         const overlap = ra + rb - dist;

    //         if (overlap <= 0) return false; // 분리 발견 → 충돌 아님

    //         if (overlap < minOverlap) {
    //             minOverlap = overlap;
    //             // MTV 방향: A -> B 바깥쪽
    //             // mtvAxW = axis * sign(dot(t,axis))
    //             mtvAxW.Import(axis);
                
    //             if (CMath.V3Dot(t, mtvAxW) < 0) CMath.V3MulFloat(mtvAxW, -1, mtvAxW);
    //             bestAx.Import(mtvAxW);
    //         }
    //         return true;
    //     };

    //     // 3.1 A의 3축, B의 3축
    //     if (!testAxis(a.axes[0])) { ReturnFun(); return null; }
    //     if (!testAxis(a.axes[1])) { ReturnFun(); return null; }
    //     if (!testAxis(a.axes[2])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[0])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[1])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[2])) { ReturnFun(); return null; }

    //     // 3.2 교차축 9개 (즉시 계산/검사, 저장 없음)
    //     for (let i=0;i<3;i++){
    //         for (let j=0;j<3;j++){
    //             CMath.V3Cross(a.axes[i], b.axes[j], cross);
    //             // 거의 평행이면 스킵
    //             if (CMath.V3Dot(cross, cross) <= EPS2) continue;
    //             CMath.V3Nor(cross, cross);
    //             if (!testAxis(cross)) { ReturnFun(); return null; }
    //         }
    //     }

    //     // ---- 4) MTV 계산/반환 ----
    //     CMath.V3MulFloat(bestAx, minOverlap, mtv);

    //     const out = _push || new CVec3();
    //     out.Import(mtv);

    //     ReturnFun();
    //     return out;
    // }

    static Grad(_hash : number, _x : number, _y : number) 
    {
        return ((_hash & 1) == 0 ? _x : -_x) + ((_hash & 2) == 0 ? _y : -_y);
    }
    static perm : Array<number> = [
        151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
        151
    ];
    static Noise(_x : number, _y : number) {
        var X = Math.floor(_x) & 0xff;
        var Y = Math.floor(_y) & 0xff;
        _x -= Math.floor(_x);
        _y -= Math.floor(_y);
        var u = _x * _x * _x * (_x * (_x * 6 - 15) + 10);
        var v = _y * _y * _y * (_y * (_y * 6 - 15) + 10);

        var A = (this.perm[X  ] + Y) & 0xff;
        var B = (this.perm[X+1] + Y) & 0xff;
        var r = CMath.FloatInterpolate(
            CMath.FloatInterpolate(this.Grad(this.perm[A  ], _x, _y  ), this.Grad(this.perm[B  ], _x-1, _y  ), u),
            CMath.FloatInterpolate(this.Grad(this.perm[A+1], _x, _y-1), this.Grad(this.perm[B+1], _x-1, _y-1), u), 
            v
        );
        return (1 + r) / 2;
    }
    static ClosesetPointOnPlane(_planeNor : CVec3, _planeDis : number, _point : CVec3) {
        let dis = CMath.V3Dot(_planeNor, _point) + _planeDis;
        return CMath.V3SubV3(_point, CMath.V3MulFloat(_planeNor, dis));
    }
    //0~1 전체 포지션에서 위치를 가져옴
    static WeightVec3(pa_vec : Array<CVec3>,pa_persent)
    {
        if(pa_vec.length==1)
            return pa_vec[0];
        if(Math.trunc(pa_persent)>=1)
            return pa_vec[pa_vec.length-1];
        if(pa_persent<0.00001)	pa_persent=0;

        var w=(pa_vec.length-1)*pa_persent;
        var s=Math.trunc(w);
        var e=Math.trunc((w+1));
        var p=w%1;
        var t0=CPoolGeo.ProductV3();
        var t1=CPoolGeo.ProductV3();
        CMath.V3MulFloat(pa_vec[s],1-p,t0);
        CMath.V3MulFloat(pa_vec[e],p,t1)
        var v=CMath.V3AddV3(t0,t1);
        CPoolGeo.RecycleV3(t0);
        CPoolGeo.RecycleV3(t1);
        
        return v;
        
    }
    static CubeVec3InLen(_bound : CBound,_posVec3:CVec3) : number //벡터, 직육면체 크기
	{
		//let radV3 = new CVec3();
		let radV3=CPoolGeo.ProductV3();
		let cuberad = CMath.V3MulFloat(_bound.GetSize(),0.5);
		radV3.x = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.x),CMath.V3Len(new CVec3(0,CMath.Abs(_posVec3.y),CMath.Abs(_posVec3.z)))));
		radV3.y = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.y),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),0,CMath.Abs(_posVec3.z)))));
		radV3.z = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.z),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),CMath.Abs(_posVec3.y),0))));
		let len=CMath.V3Len(new CVec3(Math.sin(CMath.DegreeToRadian(radV3.x))*cuberad.x,Math.sin(CMath.DegreeToRadian(radV3.y))*cuberad.y,Math.sin(CMath.DegreeToRadian(radV3.z))*cuberad.z));
        CPoolGeo.RecycleV3(radV3);
		return len;
	}
}